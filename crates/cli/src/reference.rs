pub const REFERENCE: &str = r#"Timefairy CLI — command reference
====================================

PURPOSE
  CLI for the Timefairy time-tracking API. Use it to configure the API URL,
  log in, list projects, and log time. Designed for interactive use and for
  AI agents (non-interactive flags where possible).

QUICK START
  1. timefairy config              # set API URL (interactive menu)
  2. timefairy login               # email + hidden password prompt
  3. timefairy projects list
  4. timefairy add-time --project "Name" --duration 2h --note "Work"

FILES
  ~/.timefairy/config.json       apiUrl (API base URL, no trailing slash)
  ~/.timefairy/credentials.json  accessToken, refreshToken (mode 600)

API URL RESOLUTION (first match wins)
  1. --api-url on the command line (also persisted to config.json)
  2. TIMEFAIRY_API_URL environment variable
  3. apiUrl in ~/.timefairy/config.json
  4. Default: http://localhost:3000

AUTH
  login   Interactive prompts (preferred). Optional: --email, hidden --password.
  logout  Removes ~/.timefairy/credentials.json
  Most commands require a prior successful login.

GLOBAL OPTIONS
  --api-url <URL>    Override API base URL; saves to config when provided
  -h, --help         Command help
  --version          CLI version

COMMANDS
----------

timefairy reference
  (alias: docs)
  Print this reference to stdout. Use for AI agent onboarding.

timefairy setup [--api-url <URL>]
  First-time configuration. Without --api-url: interactive config menu (same as
  `timefairy config`). With --api-url: save URL and exit.

timefairy config
  Interactive menu: view/change API URL, show config path. Changes save immediately.

timefairy config get
  Print config file path and current apiUrl.

timefairy config path
  Print path to ~/.timefairy/config.json

timefairy config set api-url <URL>
  Set apiUrl in config.json (non-interactive).

timefairy login [--email <EMAIL>]
  Log in to the API. Prompts for email/password if omitted. Do not pass --password
  on the shell command line (history leak). Session stored in credentials.json.

timefairy logout
  Clear stored tokens.

timefairy projects list
  List projects (name · client). Requires login.

timefairy add-time [OPTIONS]   (alias: add-entry)
timefairy entries add [OPTIONS]   (alias: entries add-entry)
  Create a time entry. All fields optional; missing fields prompt when needed.
  Entry options:
    --project <NAME>     Project name (case-insensitive)
    --task <TITLE|UUID>  Task title or id (scoped to project when set)
    --start <DATETIME>   ISO-8601 or YYYY-MM-DDTHH:MM (local)
    --end <DATETIME>     Requires --start; duration computed by API
    --duration <DUR>     2h, 90m, or decimal hours
    --note <TEXT>        Entry description
    --date <YYYY-MM-DD>  Optional anchor date for duration-only mode
    --interactive        Prompt for any missing fields
  Requires at least --duration, --start, or --start + --end (or interactive).
  Examples:
    timefairy entries add --project "Demo" --duration 2h --note "Review"
    timefairy entries add --project "Demo" --task "Bug fix" --start "2026-05-31T09:00" --end "2026-05-31T11:00"
    timefairy add-time --interactive
  Requires login.

timefairy entries today
  List today's time entries (by createdAt date, local timezone). Requires login.

HELP PER COMMAND
  timefairy <command> --help
  timefairy <command> <subcommand> --help

ERRORS
  "Not logged in. Run: timefairy login" — missing or empty credentials.json
  "API error: ..." — HTTP/API failure (check URL, auth, server)

NOT YET IN CLI (API may exist; use web or future CLI)
  - Create projects / clients
  - Tasks create/update (list via --task lookup only)
  - --json machine output

AGENT TIPS
  - Run `timefairy reference` once per session for full syntax.
  - Prefer: config set api-url, login (no password flag), projects list, add-time with flags.
  - Avoid interactive/TUI commands in CI (--interactive, bare `config`, bare `login` without flags).
  - Verify API is reachable at resolved URL before login.
"#;
