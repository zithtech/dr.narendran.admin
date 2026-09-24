# HMS Admin Frontend

Administration portal for managing hospitals, branches, doctors, patients, user accounts, and doctor availability.

## Requirements

- Node.js `20.19+` or `22.12+`
- npm (the lockfile is committed for reproducible installs)
- An HMS API server

## Local setup

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env` and set the API base URL:

   ```env
   VITE_API_BASE_URL=http://localhost:4000/api/
   ```

3. Start the development server:

   ```sh
   npm run dev
   ```

Vite prints the local URL after it starts.

## Commands

- `npm run dev` — start the development server
- `npm run typecheck` — run the TypeScript compiler checks
- `npm run lint` — run ESLint
- `npm run build` — create a production build in `dist/`
- `npm run preview` — serve the production build locally
- `npm run verify` — run all pre-commit checks

## Configuration

`VITE_API_BASE_URL` must point to the API root and should include its trailing slash. Local `.env` files are ignored by Git; commit only `.env.example`.

Authentication tokens are stored in browser local storage and attached to API requests automatically. An unauthorized API response clears the stored token and returns the user to the login page.

## Git workflow

Run `npm run verify` before committing. Build output, installed dependencies, local environment files, editor files, logs, and coverage output are excluded from version control.
