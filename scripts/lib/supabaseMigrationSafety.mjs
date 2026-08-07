const MANAGED_SCHEMAS = Object.freeze(['auth', 'storage', 'realtime']);
const MANAGED_DDL = new RegExp(
    String.raw`\b(?:create|alter|drop|truncate)\s+` +
    String.raw`(?:table|view|materialized\s+view|function|trigger|type|schema)\s+` +
    String.raw`(?:if\s+(?:not\s+)?exists\s+)?(?:"?(auth|storage|realtime)"?)\.`,
    'giu'
);

export function findManagedSchemaMutations(sql) {
    const source = String(sql || '');
    const findings = [];
    for (const match of source.matchAll(MANAGED_DDL)) {
        findings.push({
            schema: match[1].toLowerCase(),
            statement: match[0].replace(/\s+/g, ' ').trim(),
            offset: match.index
        });
    }
    return findings;
}

export function assertSupabaseMigrationSafe(sql, fileName = 'migration.sql') {
    const findings = findManagedSchemaMutations(sql);
    if (findings.length > 0) {
        const schemas = [...new Set(findings.map(finding => finding.schema))];
        throw new Error(
            `${fileName} mutates provider-managed schema(s): ${schemas.join(', ')}`
        );
    }
    return true;
}

export { MANAGED_SCHEMAS };
