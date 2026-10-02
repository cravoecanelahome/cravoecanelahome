<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Access control: roles live in `team_members` (keyed by email, checked via `current_app_role()`/`is_admin()`); public signup is disabled and accounts are created only by invite from server functions in `src/lib/team.functions.ts`. Why: keeps roles off user records and lets admins change emails.
- Sellers never read `products`/`sales`/`fee_settings` directly; they use the `catalog()`/`today_sales()` functions and `register_sale()` computes fees server-side. Why: hides costs and margins at the database level, not just in the screens.
- Customer writes use a validated authenticated server function; structured address columns coexist with the legacy address field. Why: enforce format beyond the browser and preserve older customer records.
- Team management is owner-only (`is_owner()` in RLS and `team.functions.ts`; Shell hides the tab by the same email). Why: only the owner may grant access, even among admins.
- AI agents (`/agentes`) run in admin-only server functions (`agents.functions.ts` → `agents.server.ts`); stock changes are proposed by the AI and applied only after explicit confirmation, logged in `stock_movements`. Why: keeps sensitive costs out of shared channels and prevents unreviewed AI writes.
- n8n reaches agents via `/api/public/agents` with the `x-agent-secret` header (AGENTS_N8N_SECRET); it returns advice/proposals only and never writes. Why: external callers must not alter stock.
- Inactivity logout lives in AuthGate using a shared localStorage timestamp. Why: applies across tabs without server state.
