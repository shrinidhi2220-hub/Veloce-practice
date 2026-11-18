# VELOCE storefront

## Local development

Requires Node.js 20.19+ or 22.12+ (Vite 8 requirement) and npm.

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_API_URL` in `.env` if the backend is not at `http://localhost:3000`.
When the backend cannot be reached, the catalog/cart/checkout can be explored in
clearly labeled local demo mode; authentication and other account features need
the backend and database.

Build and lint with `npm run build` and `npm run lint`.
