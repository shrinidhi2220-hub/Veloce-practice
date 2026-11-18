# VELOCE API

## Requirements

Node.js 20.19+ or 22.12+, npm, and a PostgreSQL database (Aiven is supported).

## Configure and run

```powershell
cd Veloce-practice-member1-backend-foundation\backend
npm install
Copy-Item .env.example .env
```

Set `DATABASE_URL` to the PostgreSQL/Aiven connection URL and replace
`JWT_SECRET` with a unique random value of at least 32 characters in `.env`.
Keep the environment file private.

```powershell
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The API listens on port 3000 by default. `CORS_ORIGIN` should match the frontend
origin (default `http://localhost:5173`). `/health` confirms the HTTP service is
up; the backend performs its PostgreSQL connection check when starting.

See `../MEMBER1_API_DOCUMENTATION.md` for the established API contract.
