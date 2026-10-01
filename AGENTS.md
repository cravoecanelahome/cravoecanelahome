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
