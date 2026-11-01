# MaaCrave Admin

A separate, internal website for the MaaCrave team. It is **not part of the app** and has its own sign-in.

- Only emails listed in the API's `ADMIN_EMAILS` can sign in (6-digit code by email).
- Sessions use a separate secret (`ADMIN_JWT_SECRET`) and last 8 hours; closing the tab signs you out.
- Every action is saved in the Activity log.

What you can do: approve / ask for changes / suspend cook and rider applications (with their NID and kitchen photos), resolve reports and refund, suspend or restore people, see orders, and mark payouts as paid.

## Deploy
Vercel → Add New Project → same GitHub repo → **Root Directory: `admin`** → Framework: Other → Deploy.
Then add the admin site's address (e.g. `https://maacrave-admin.vercel.app`) to `CORS_ORIGINS` on Render.
The API address is in `config.js`.
