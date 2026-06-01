# Timefairy

Time tracking monorepo: NestJS API, Vite admin/user web, Rust CLI, Expo mobile (scaffold), Tauri desktop (scaffold).

## Stack

- **API:** NestJS + Prisma + PostgreSQL
- **Web:** Vite + React + TanStack Query
- **CLI:** Rust (clap + ratatui)
- **Dev env:** [Devbox](https://www.jetify.com/devbox)
- **Deploy:** Docker Compose (postgres + api + web) — see [docs/deployment.md](docs/deployment.md) for remote deploy with Traefik

## Quick start (Devbox)

```bash
# Install devbox: https://www.jetify.com/devbox/docs/installing_devbox/
devbox shell                  # IMPORTANT: use devbox Node 22 + pnpm 10 (not system nvm)
node -v                       # should be v22.x
pnpm -v                       # should be 10.x
devbox services up            # PostgreSQL
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:setup
pnpm db:migrate
pnpm db:seed
pnpm dev
```

> **Note:** Run commands inside `devbox shell` (or with working direnv). System Node/pnpm (e.g. nvm 20 + pnpm 9) will fail — `approve-builds` exists only in pnpm 10+; this repo whitelists native builds via `pnpm.onlyBuiltDependencies` in `package.json` instead.

- Web: http://localhost:5173
- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs

**Default admin:** `admin@timefairy.local` / `admin123`

## Docker Compose

```bash
cp .env.example .env
docker compose up --build -d
```

- Web: http://localhost:8080 (nginx proxies `/api` to backend)

Seed runs via `prisma migrate deploy` on API startup. Run seed manually:

```bash
docker compose exec api sh -c "cd /app/apps/api && npx prisma db seed"
```

## CLI

First time in devbox (Rust toolchain):

```bash
devbox shell
rustup default stable
```

Build and install globally for local testing (`~/.cargo/bin/timefairy` — add to PATH if needed):

```bash
devbox run cli:build
devbox run cli:install
export PATH="$HOME/.cargo/bin:$PATH"
timefairy --help
```

After code changes, reinstall: `devbox run cli:install`.

Quick run without install:

```bash
devbox run cli -- login
devbox run cli -- projects list
devbox run cli -- add-time --project "Demo Project" --duration 2h --note "CLI entry"
devbox run cli -- add-time --interactive
```

API must be running (`pnpm dev` or Docker).

Configure API URL (saved automatically to `~/.timefairy/config.json`):

```bash
timefairy config          # interactive menu; each change saves immediately
timefairy setup           # same menu (or --api-url to set without prompts)
timefairy config get
timefairy config set api-url http://localhost:3000
```

Passing `--api-url` on any command also updates the config file.

Priority: `--api-url` / `TIMEFAIRY_API_URL` env → config file → `http://localhost:3000`.

`timefairy login` prompts for email and password (password is hidden). Tokens are stored in `~/.timefairy/credentials.json` (mode 600). Avoid `--password` on the command line.

Full command list for humans and AI agents:

```bash
timefairy reference   # alias: timefairy docs
```

## Project structure

```
apps/api          NestJS backend
apps/web          Vite React (admin + user)
apps/mobile       Expo scaffold
apps/desktop      Tauri scaffold
packages/shared-types
packages/api-client
crates/core       Rust HTTP client
crates/cli        Rust TUI CLI
```

## Troubleshooting

### `P1000: Authentication failed` on `pnpm db:migrate`

Something else is often bound to port **5432** (another Docker Postgres). Check:

```bash
lsof -i :5432
```

Either stop that container (`docker stop <name>`) and use Devbox Postgres (`devbox services up`, then `pnpm db:setup`), or point `.env` `DATABASE_URL` at the database you intend to use.

### Docker build: `io: read/write on closed pipe`

Remote Buildx builders (`docker-container:…`) can fail when exporting the image. This repo forces the local builder:

```bash
pnpm docker:up   # uses BUILDX_BUILDER=default
```

Or manually: `docker buildx use default`, then `docker compose up --build -d`.

### Docker build: `no space left on device`

Docker Desktop uses its own disk image. Free space before rebuilding:

```bash
docker builder prune -af
docker image prune -af
```

If you still run out of space, increase **Settings → Resources → Disk image size** in Docker Desktop, or remove unused volumes: `docker volume prune` (only if you do not need their data).

## Environment

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token secret |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `API_PORT` | API port (default 3000) |
| `VITE_API_URL` | Web API base URL (empty in Docker = same origin) |
| `TIMEFAIRY_API_URL` | CLI API base URL |
