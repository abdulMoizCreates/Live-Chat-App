# Project rules

- Monorepo: `client/` (Next.js 14 app router, plain JavaScript) and `server/` (Express, Socket.IO, Mongoose).
- Do not rewrite working code unnecessarily. Extend what exists.
- Write simple, human-style code: small files, clear names, short comments only where logic is not obvious. No over-engineering, no TypeScript, no extra libraries unless needed.
- Server: routes in `routes/`, models in `models/`, socket logic in `sockets/`, auth middleware in `middleware/`.
- Client: reusable components in `client/components/`, API helpers in `client/lib/`.
- Never hardcode URLs or secrets, use env variables and update `.env.example` files.
- After each phase: make sure `npm run dev` works on both sides, and list the manual test steps.