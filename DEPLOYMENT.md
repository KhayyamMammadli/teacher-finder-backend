# Render + Supabase deployment

## 1. Supabase database

Supabase SQL editor-da asagidaki migration-lari icra et:

- `src/sql/001_email_otps.sql`
- layihenin istifade etdiyi `users` ve `teachers` cedvellerinin schema-si de Supabase-da movcud olmalidir

`DATABASE_URL` ucun Supabase Postgres connection string istifade et. SSL aktiv olmalidir.

Example:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-SUPABASE-HOST]:5432/postgres?sslmode=require
```

## 2. Render backend service

Render-da yeni `Web Service` yarat:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

Environment variables:

```env
PORT=5050
JWT_SECRET=strong-random-secret
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-SUPABASE-HOST]:5432/postgres?sslmode=require
CORS_ORIGIN=https://your-azstore-web.onrender.com,https://your-azstore-admin.onrender.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=example@gmail.com
SMTP_PASS=app-password
SMTP_FROM=AzStore <no-reply@azstore.az>
```

Notes:

- Render `PORT` variable-ni ozu vere biler. App `PORT` env-ni birbasa istifade edir.
- `/health` endpoint hem servis, hem de database baglantisini yoxlayir.
- `CORS_ORIGIN` vergulle ayrilan bir nece origin qebul edir.

## 3. Render frontend service

Render-da `Static Site` ve ya `Web Service` yarada bilersen.

Recommended:

- Root Directory: `teacher-finder-web`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

Environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-azstore-api.onrender.com
NEXT_PUBLIC_SITE_URL=https://your-azstore-web.onrender.com
```

## 4. Smoke test

Deploy bitenden sonra bunlari yoxla:

- `https://your-azstore-api.onrender.com/`
- `https://your-azstore-api.onrender.com/health`
- frontend-de qeydiyyat OTP sorghusu

## 5. Common failures

### `503 Database connection failed`

Sebeb:

- `DATABASE_URL` sehvdir
- Supabase IP/network temporary issue var
- schema tam qurulmayib

### `CORS origin is not allowed`

Sebeb:

- `CORS_ORIGIN` daxilinde frontend domeni yoxdur

### OTP email getmir

Sebeb:

- SMTP env-leri duzgun deyil
- production-da SMTP yoxdursa mail gonderilmesi fail olacaq
