# Pools by Pros — Facebook Quote Form

Single-page Next.js form for Facebook ads. Collects lead info, then opens a calendar modal to pick an available visit day and posts to Cloud Function `leadIntake`.

## Local

```bash
cd frontend-form
cp .env.local.example .env.local
npm install
npm run dev
```

Default port is usually [http://localhost:3000](http://localhost:3000) (or the next free port).

## Env

- `NEXT_PUBLIC_INTAKE_URL` — Cloud Function URL
- `NEXT_PUBLIC_INTAKE_KEY` — matches `LEAD_INTAKE_KEY` in `backend-cms/env.yaml`
