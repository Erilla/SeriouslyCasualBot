# SeriouslyCasualBot

Discord bot for the WoW guild **Seriously Casual** on EU-Silvermoon. Manages guild applications, trial reviews, raid rosters, loot priority, EPGP rankings, and guild info channels.

## Tech Stack

- **Runtime:** Node.js with CommonJS modules
- **Discord:** discord.js v14 (slash commands, buttons, modals, select menus, threads)
- **Database:** SQLite via Keyv (14 namespaced key-value stores)
- **HTTP:** axios + node-fetch for external API calls
- **Scheduling:** node-cron + setInterval for recurring tasks
- **External APIs:** Raider.io, WoW Audit, WarcraftLogs (GraphQL), EPGP, Battle.net (deprecated)

## Features

| Feature | Description |
|---------|-------------|
| **Applications** | Monitors new guild applications, copies them to a review channel with Accept/Reject buttons, and runs a 4-option voting system |
| **Trial Review** | Tracks new member probation periods with automated review alerts at 2 and 4 weeks, WarcraftLogs integration, and promotion scheduling |
| **Raid Roster** | Syncs guild roster from Raider.io every 10 minutes, links Discord users to characters, and manages an ignore list |
| **Signup Alerts** | Reminds unsigned raiders before raid days (Wed/Sun) via cron-scheduled messages with WoW Audit integration |
| **Weekly Reports** | Posts M+ and Great Vault summaries every Wednesday as file attachments |
| **Loot Priority** | Creates per-boss loot signup posts with Major/Minor/Want In/Do Not Need buttons |
| **EPGP** | Displays effort/gear point priority rankings filtered by tier token or armour type, auto-updated every 10 minutes |
| **Guild Info** | Manages About Us, Raid Schedule, Recruitment, and Achievement embeds in a dedicated channel |
| **Settings** | Toggle signup alert reminders on/off per raid day |

## Setup

1. Clone the repository
2. Copy `example-config.json` to `config.json` and fill in all values (Discord IDs, API credentials, channel IDs)
3. Install dependencies:
   ```
   npm install
   ```
4. Start the bot:
   ```
   npm run start
   ```
   Or with auto-restart on file changes:
   ```
   npm run watch
   ```

## Configuration

All configuration is in `config.json` (gitignored). See `example-config.json` for the template. Key values include:

- **Discord:** Bot token, client ID, guild ID, channel IDs, role IDs
- **APIs:** WarcraftLogs OAuth credentials, WoW Audit API secret, Battle.net OAuth credentials
- **Database:** SQLite connection string (default: `sqlite://./db.sqlite`)

## Project Structure

```
SeriouslyCasualBot/
+-- index.js                Entry point - creates client, loads commands/events
+-- deploy-commands.js      Registers slash commands with Discord (guild-scoped)
+-- config.json             Credentials and IDs (gitignored)
+-- commands/               Slash command definitions (9 files)
+-- events/                 Discord event handlers
|   +-- ready.js            Bot startup, scheduled task initialization
|   +-- interactionCreate.js  Interaction routing (commands, buttons, modals, selects)
+-- functions/              Business logic organized by domain
|   +-- applications/       Application pipeline (9 files)
|   +-- trial-review/       Trial review system (~24 files)
|   +-- raids/              Roster sync, alerts, reports (~20 files)
|   +-- loot/               Loot priority signups (6 files)
|   +-- epgp/               EPGP priority rankings (1 file)
|   +-- guild-info/         Guild info embeds (5 files)
|   +-- settings/           Feature toggles (4 files)
+-- services/               External API wrappers
|   +-- raiderioService.js  Raider.io API (guild roster, rankings, M+ data)
|   +-- wowauditService.js  WoW Audit API (raid signups, historical data)
|   +-- epgpService.js      EPGP API (priority rankings)
|   +-- battleNetService.js Battle.net API (deprecated)
+-- data/                   Static JSON content + auto-generated raider backup
+-- docs/design/            Design documentation (15 specification documents)
```

## Design Documentation

Comprehensive design documents are in [`docs/design/`](docs/design/README.md). These are specification-level documents detailed enough to rebuild the system from scratch, covering architecture, all business domains, external APIs, database schema, scheduled tasks, deployment, and command reference.

## Deployment

Deployment is handled via GitHub Actions:

1. **Deploy** (`main.yml`) - Manual trigger, substitutes secrets into config.json, uploads via SFTP
2. **Restart** (`restart.yml`) - Runs on self-hosted runner after deploy, restarts via PM2

## Discord Bot Permissions

### Required Scopes
- Bot
- Applications.Commands

### Required Bot Permissions
- Manage Channels
- Read Messages/View Channels
- Send Messages
- Create Public Threads
- Send Messages in Threads
- Manage Messages
- Manage Threads
- Embed Links
- Read Message History
- Use External Emojis
- Use External Stickers

## Code Style

Enforced via ESLint:
- Tabs for indentation
- Single quotes, semicolons required
- Trailing commas in multiline
- Stroustrup brace style
- `const` over `let`, no `var`

Run the linter:
```
npx eslint .
```
