# FinTrackr

FinTrackr is split into two deployable applications:

- the backend service lives at the repository root as a NestJS API with Prisma and PostgreSQL
- `frontend/` is a Vite + React client intended for Vercel.

This repo is prepared for:

- Render for the backend API
- Vercel for the frontend SPA

## Project Layout

- `src/`: NestJS backend source
- `prisma/`: Prisma schema and migrations
- `frontend/`: React frontend
- `render.yaml`: Render blueprint for the backend
- `frontend/vercel.json`: Vercel config for the frontend

## Environment Variables

Backend example: [.env.example](./.env.example)

Frontend example: [frontend/.env.example](./frontend/.env.example)

### Backend

Required in production:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_ORIGINS`

Optional:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ALLOW_VERCEL_PREVIEWS`
- `PORT`
- `HOST`

### Frontend

Required in production:

- `VITE_API_URL`

Example:

```env
VITE_API_URL="https://your-render-service.onrender.com"
```

## Local Development

Start Postgres locally:

```bash
docker compose up -d
```

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
npm --prefix frontend install
```

Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```

Run backend:

```bash
npm run start:dev
```

Run frontend:

```bash
npm run frontend:dev
```

## Production Scripts

Backend:

```bash
npm run backend:build
npm run backend:start
npm run prisma:migrate:deploy
```

Frontend:

```bash
npm run frontend:build
npm run frontend:preview
```

Full verification:

```bash
npm run deploy:check
```

## Render Deployment

The backend is configured through [render.yaml](./render.yaml).

Recommended Render environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_ORIGINS`
- `OPENAI_API_KEY` if AI chat should be enabled

Set `FRONTEND_ORIGINS` to your Vercel production URL and any custom domain, comma-separated. Leave `ALLOW_VERCEL_PREVIEWS=true` if you want preview deployments from `*.vercel.app` to call the API.

## Vercel Deployment

Deploy the `frontend/` directory as its own Vercel project.

Set:

- Root Directory: `frontend`
- Environment Variable: `VITE_API_URL=https://your-render-service.onrender.com`

The frontend Vercel config is in [frontend/vercel.json](./frontend/vercel.json).

## API Routes

- `GET /`
- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `GET /expenses`
- `POST /expenses`
- `GET /expenses/:id`
- `PATCH /expenses/:id`
- `DELETE /expenses/:id`
- `POST /ai/chat`
- `POST /contact`

## Notes

- `.env`, build outputs, logs, and tsbuildinfo files are now ignored by git.
- The frontend no longer hardcodes the backend URL for production.
- The backend no longer hardcodes localhost CORS and is ready for Render/Vercel origins.
