// Nardora synthetic private-table trial front door.
// The platform verifies the user JWT before this handler runs. This function
// verifies the user again with Auth, replaces actorId with that verified UUID,
// and calls service-only Postgres RPCs without exposing the secret key.

const JSON_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

const MAX_BODY_BYTES = 32 * 1024;

type JsonObject = Record<string, unknown>;

function response(body: JsonObject, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function getNamedKey(variableName: string): string {
  const raw = Deno.env.get(variableName);
  if (!raw) throw new Error(`Missing ${variableName}`);

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const value = parsed.default;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing default key in ${variableName}`);
  }
  return value;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

function asObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonObject;
}

function protocolErrorFromDatabase(value: unknown): JsonObject {
  const failure = asObject(value) ?? {};
  let code = "database_error";
  let details: unknown = {};

  if (typeof failure.details === "string") {
    try {
      const parsed = asObject(JSON.parse(failure.details));
      if (parsed && typeof parsed.code === "string") code = parsed.code;
      if (parsed && parsed.details !== undefined) details = parsed.details;
    } catch {
      // Keep the generic code. Database internals are intentionally not echoed.
    }
  }

  const message = code === "database_error"
    ? "The trusted table service rejected the request"
    : (typeof failure.message === "string"
      ? failure.message
      : "The private-table command was rejected");

  return { code, message, details };
}

async function readBody(request: Request): Promise<JsonObject | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return null;
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null;

  try {
    return asObject(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function authenticatedUserId(
  projectUrl: string,
  publishableKey: string,
  token: string,
): Promise<string | null> {
  const authResponse = await fetch(`${projectUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!authResponse.ok) return null;

  const user = asObject(await authResponse.json());
  return user && typeof user.id === "string" ? user.id : null;
}

async function callRpc(
  projectUrl: string,
  secretKey: string,
  rpcName: string,
  body: JsonObject,
): Promise<Response> {
  return fetch(`${projectUrl}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: {
      apikey: secretKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
  }
  if (request.method !== "POST") {
    return response({
      error: { code: "method_not_allowed", message: "Use POST" },
    }, 405);
  }

  try {
    const token = bearerToken(request);
    if (!token) {
      return response({
        error: { code: "authentication_required", message: "Sign in first" },
      }, 401);
    }

    const projectUrl = Deno.env.get("SUPABASE_URL");
    if (!projectUrl) throw new Error("Missing SUPABASE_URL");

    const publishableKey = getNamedKey("SUPABASE_PUBLISHABLE_KEYS");
    const secretKey = getNamedKey("SUPABASE_SECRET_KEYS");
    const actorId = await authenticatedUserId(projectUrl, publishableKey, token);
    if (!actorId) {
      return response({
        error: { code: "invalid_session", message: "Session is not valid" },
      }, 401);
    }

    const body = await readBody(request);
    if (!body) {
      return response({
        error: { code: "invalid_request", message: "Invalid or oversized JSON body" },
      }, 400);
    }

    const action = body.action;
    let rpcName: string;
    let rpcBody: JsonObject;

    if (action === "command") {
      const command = asObject(body.command);
      if (!command) {
        return response({
          error: { code: "invalid_command", message: "Command is required" },
        }, 400);
      }
      if (
        typeof command.actorId === "string" &&
        command.actorId !== actorId
      ) {
        return response({
          error: {
            code: "identity_mismatch",
            message: "Command actor does not match the signed-in user",
          },
        }, 403);
      }
      if (typeof command.sessionId !== "string" || !command.sessionId) {
        return response({
          error: { code: "invalid_command", message: "sessionId is required" },
        }, 400);
      }

      rpcName = "private_table_dispatch";
      rpcBody = {
        p_actor_id: actorId,
        p_session_id: command.sessionId,
        p_command: { ...command, actorId },
      };
    } else if (action === "snapshot") {
      if (typeof body.roomId !== "string" || typeof body.sessionId !== "string") {
        return response({
          error: { code: "invalid_request", message: "roomId and sessionId are required" },
        }, 400);
      }
      rpcName = "private_table_snapshot";
      rpcBody = {
        p_actor_id: actorId,
        p_room_id: body.roomId,
        p_session_id: body.sessionId,
      };
    } else {
      return response({
        error: { code: "invalid_request", message: "Unknown action" },
      }, 400);
    }

    const rpcResponse = await callRpc(projectUrl, secretKey, rpcName, rpcBody);
    const rpcPayload: unknown = await rpcResponse.json().catch(() => ({}));
    if (!rpcResponse.ok) {
      const error = protocolErrorFromDatabase(rpcPayload);
      const status = error.code === "database_error" ? 500 : 409;
      return response({ error }, status);
    }

    return response({ data: rpcPayload });
  } catch {
    // Tokens, keys, command payloads, and database internals are never logged.
    return response({
      error: { code: "service_unavailable", message: "Private-table service unavailable" },
    }, 503);
  }
});
