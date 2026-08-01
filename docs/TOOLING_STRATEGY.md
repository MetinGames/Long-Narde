# Nardora Tooling and Plugin Strategy

Last reviewed: **2026-08-01**  
Policy: **Minimum toolset, maximum leverage**

ChatGPT plugins extend Codex/ChatGPT with workflows and connected services. They do not automatically add their service to the Nardora game. A production capability usually needs three separate decisions:

1. install/authorize the ChatGPT plugin so Codex can work with the service;
2. create/configure the external service account or project;
3. integrate and test the service SDK or deployment in Nardora.

No paid service, new player-data collection, or production connection is activated without Metin's explicit approval.

## 1. Current minimum stack

| Tool | Form | Decision | Purpose |
|---|---|---|---|
| GitHub | Installed plugin + repository | **Keep** | Source code, Issues, ROADMAP, CI and durable history |
| GitHub Actions | Repository workflow | **Keep and extend** | Unit tests now; Playwright and security checks next |
| VS Code + Git + Node.js | Local programs | **Keep** | Existing working development environment |
| Playwright | npm development dependency | **Add now (Issue #3)** | Chromium, Firefox, WebKit, touch/mobile emulation and visual regression |
| CodeQL | GitHub security setting/workflow | **Enable now** | Automated JavaScript and workflow vulnerability scanning |

## 2. ChatGPT plugins to install now

| Plugin | Why now | First use | Guardrail |
|---|---|---|---|
| **Product Design** | Nardora needs a coherent professional UX/design system, not isolated CSS fixes | Audit start screen, board, side panel, responsive hierarchy and accessibility; define design tokens and component rules | Product decisions remain aligned with the current Anatolian identity and Metin's approval |
| **Codex Security** | Creates an evidence-backed security baseline before PWA, accounts and online services increase the attack surface | Read-only full-repository scan; triage findings; convert confirmed issues into GitHub work | Scan only the owned repository; do not auto-fix unconfirmed findings |
| **Cloudflare** | Current GitHub Pages production link has no first-class PR preview lane | Connect the repo to Pages and create branch/PR preview URLs without replacing the production URL initially | Use Cloudflare as the one preview platform; do not add Vercel in parallel |

Installation alone is reversible. Connecting Cloudflare or any account is a separate authorized setup step.

## 3. Connect at the next quality checkpoint

| Plugin/service | Trigger | Decision |
|---|---|---|
| **Sentry + JavaScript SDK** | First stable external-tester build after Playwright coverage | Add error monitoring for uncaught browser failures; filter noise and review privacy/data fields before launch |
| **Figma** | Nardora brand system/icon/store-asset sprint begins | Use as the editable source for logo, icon, typography, colors and screen designs; not needed for day-to-day code changes before that sprint |
| Chrome Lighthouse | PWA foundation is implemented | Run installability, performance, accessibility and best-practice checks locally/CI; no plugin required |
| Audacity or equivalent audio editor | Metin provides original dice/checker recordings | Trim, normalize and export web/mobile-ready assets; keep original masters |

## 4. Add only when usage justifies it

| Plugin/service | Trigger | Use |
|---|---|---|
| **PostHog** | External testing is large enough that manual feedback no longer explains player friction | Privacy-masked product events/funnels; canvas session replay only after performance/privacy testing |
| **Data Analytics** | PostHog/store/financial exports contain enough real data for recurring analysis | Retention, funnel, cohort and experiment analysis |
| Real-device cloud testing | Playwright emulation cannot reproduce device-specific failures | Small targeted iPhone/Android device matrix, not continuous broad spending |
| **Semrush** | A public marketing site and acquisition content exist | Web SEO research; not a substitute for App Store/Yandex listing work |

Suggested analytics trigger: at least a repeated external testing flow or a public beta where manual reports are no longer sufficient. Player data categories and consent must be decided before integration.

## 5. Online/private-table phase

| Plugin/service | Decision | Purpose |
|---|---|---|
| **Supabase** | Preferred candidate; install/connect during the online architecture spike | Authentication, Postgres, room metadata, presence and realtime events |
| Authoritative server/edge validation | Required architecture, not optional | Dice, legal moves, results, ratings, reconnect and anti-cheat |
| **Sentry** | Extend to online/server components | Client/server error correlation and release health |
| **Codex Security** | Run scoped and deep scans | Auth, authorization, RLS, secrets, data exposure and abuse paths |

Do not install Neon Postgres alongside Supabase for the same database role unless a time-boxed benchmark exposes a concrete Supabase limitation.

## 6. Mobile and store phase

| Plugin/program | Trigger | Decision |
|---|---|---|
| Capacitor | PWA/local web quality gate passes | Package the proven web codebase for Android/iOS |
| Android Studio + Android SDK | Android packaging sprint | Install then; avoid current machine/setup distraction before the web gate |
| **Build iOS Apps** | Capacitor iOS/TestFlight sprint | Install for Xcode/native lifecycle and store work |
| Mac + Xcode + Apple Developer access | iOS build/sign/release phase | Required delivery environment; plan access before the iOS target |
| **Creative Production** | Store launch assets are scheduled | Coordinated screenshots, campaign variants and asset production |
| **Remotion** | Trailer/app-preview video is scheduled | Reproducible motion/video assets from the approved brand system |

**Build macOS Apps** is not needed because macOS is not a current target.

## 7. Social/media phase

| Service | Trigger | Decision |
|---|---|---|
| LiveKit or equivalent | Voice/video prototype after private tables are stable | Managed realtime audio/video; permissions off by default, safety controls visible |
| Moderation/reporting operations | Before public social launch | Reporting, blocking, rate limits, sanctions, appeals and evidence retention |

HeyGen and HyperFrames are marketing/avatar-production options, not the realtime player-to-player media layer; keep them out of the product runtime.

## 8. Plugins not needed now

### Duplicate project management

Do not install **Asana, Atlassian Rovo, Linear, Monday.com, Notion, Airtable** for Nardora execution now. GitHub Issues, Projects and ROADMAP are already the source of truth. A second work queue would recreate synchronization drift.

### Duplicate app builders/hosting

Do not install **Base44, Build Web Apps, Lovable, Replit, Wix** for the existing codebase. Do not install **Vercel** while Cloudflare is the chosen preview candidate. These overlap with the established GitHub/plain-JavaScript project and would fragment delivery.

### Unrelated business/communication stack

No current Nardora need for **Apollo.io, HubSpot, Sales, Slack, Teams, Outlook Email, Outlook Calendar, Granola, Box, SharePoint, Investment Banking, Public Equity Investing, Zotero**. Re-evaluate only if the project gains a team or a defined business workflow that GitHub cannot serve.

### Deliberately deferred

- **Stripe:** only after monetization and the selling surface are decided.
- **OpenAI Developers:** no browser-side AI API is needed for the deterministic bot; client API keys are prohibited.
- **Superpowers:** no concrete Nardora bottleneck has been identified for it.
- **HeyGen/HyperFrames:** only for a defined marketing campaign, not core development.
- **Neon Postgres:** redundant while Supabase is the preferred integrated backend candidate.

## 9. Installation order

1. **Product Design** — immediate UX/design-system audit.
2. **Codex Security** — read-only baseline scan.
3. **Cloudflare** — PR preview lane during the current delivery-safety sprint.
4. Add **Playwright** and enable **CodeQL** in the repository (not ChatGPT plugins).
5. **Sentry** at the first stable external-tester build.
6. **Figma** at the brand-system/store-asset sprint.
7. **PostHog/Data Analytics** only after real usage volume and privacy decisions.
8. **Supabase**, then **Build iOS Apps**, then production/media plugins at their roadmap gates.

## 10. Tool admission checklist

Before any new tool is admitted, record:

- the exact bottleneck it removes;
- expected time/quality gain;
- account owner and permissions;
- free and paid cost thresholds;
- what repository/player data it receives;
- security and privacy review;
- integration and rollback plan;
- success metric and review date;
- removal trigger if it fails to deliver value.
