# CLAUDE.md

## Project Overview

Discord bot for WoW guild management ("Seriously Casual" on EU-Silvermoon). Built with Discord.js v14, Node.js, SQLite via Keyv, and multiple WoW API integrations.

## Commands

- `npm run start` — Start the bot (`node .`)
- `npm run watch` — Start with nodemon (auto-restart on changes)
- `npx eslint .` — Lint the codebase

No test suite exists (`npm test` is a no-op).

## Architecture

**Entry point:** `index.js` — Creates Discord client, loads commands from `commands/`, loads events from `events/`, calls `deploy-commands.js` to register slash commands with Discord, then logs in.

**Directory structure:**
- `commands/` — Slash command definitions (one file per command group). Each exports `{ data: SlashCommandBuilder, execute(interaction) }`.
- `events/` — Discord event handlers. Each exports `{ name, once?, execute(...args) }`.
- `functions/` — Business logic organized by domain: `applications/`, `epgp/`, `guild-info/`, `loot/`, `raids/`, `settings/`, `trial-review/`. Each file exports one or more functions.
- `services/` — External API wrappers: `battleNetService.js`, `epgpService.js`, `raiderioService.js`, `wowauditService.js`. Use axios for HTTP calls.

**Interaction routing:** `events/interactionCreate.js` handles commands, buttons, modals, and select menus via `interaction.isCommand()` / `isButton()` / `isModalSubmit()` / `isUserSelectMenu()` checks with `customId`-based dispatch.

**Scheduled tasks:** `events/ready.js` sets up recurring tasks using both `setInterval` (thread keep-alive, trial reviews, raider sync, achievements) and `node-cron` (raid signup alerts, M+ alerts, EPGP updates).

## Database

SQLite via Keyv with namespaced stores. Database path is configured in `config.json` as `databaseString` (default: `sqlite://./db.sqlite`).

**Keyv namespaces:** `raiders`, `raidersRealms`, `overlords`, `ignoredCharacters`, `trials`, `trialAlerts`, `promoteAlerts`, `openApplications`, `openApplicationThreads`, `applicationVotes`, `lootResponses`, `guildinfo`, `settings`

Each function file creates its own Keyv instance: `new Keyv(databaseString, { namespace: '...' })`.

## Configuration

Copy `example-config.json` to `config.json` and fill in values. Contains Discord IDs (guild, channels, roles), API credentials (Battle.net, WarcraftLogs, WowAudit), and the database connection string. `config.json` is gitignored.

## Code Style

Enforced via ESLint (`.eslintrc.json`):
- **Tabs** for indentation
- **Single quotes**, **semicolons required**
- **Trailing commas** in multiline (`"always-multiline"`)
- **Stroustrup** brace style (`} else {` is NOT used; `else` goes on new line after `}`)
- **No inline comments**
- `const` over `let`; no `var`
- Spaces inside object braces: `{ key: value }`
- No space before function parens (except async arrow: `async () =>`)
- CommonJS modules (`require`/`exports`), not ES modules

---

## Design Documentation

Comprehensive design documents live in `docs/design/`. These are specification-level documents detailed enough to rebuild the system from scratch.

| Document | Summary |
|----------|---------|
| `01-architecture-overview.md` | System architecture, tech stack, startup flow, config reference |
| `02-interaction-routing.md` | Interaction dispatch hub, button/modal/select catalogs |
| `03-domain-applications.md` | Application pipeline: monitoring, voting, accept/reject |
| `04-domain-trial-review.md` | Probation tracking: threads, alerts, WarcraftLogs, promotions |
| `05-domain-raids.md` | Roster sync, signup alerts, M+/vault reports |
| `06-domain-loot.md` | Boss loot priority signups via buttons |
| `07-domain-epgp.md` | Effort/Gear point ranking display |
| `08-domain-guild-info.md` | About Us, Schedule, Recruitment, Achievements embeds |
| `09-domain-settings.md` | Feature toggles (signup alert controls) |
| `10-services-and-apis.md` | External API integrations (Raider.io, WoW Audit, EPGP, WarcraftLogs, Battle.net) |
| `11-database-schema.md` | All 14 Keyv namespaces with shapes, readers, writers |
| `12-scheduled-tasks.md` | All intervals and cron jobs |
| `13-deployment-and-operations.md` | CI/CD, PM2, config management |
| `14-command-reference.md` | Complete slash command catalog |
| `15-data-files.md` | Static and generated JSON files |

### Shared Utility

**`functions/addOverlordsToThread.js`** — Adds all users from `overlords` namespace to a Discord thread. Used by both applications and trial-review domains after thread creation.
