# 13 -- Deployment and Operations

This document covers local development setup, CI/CD pipelines, process management, and the permissions required by the Discord bot.

---

## Local Development

### Prerequisites

- Node.js (compatible with discord.js ^14.8.0)
- npm
- A Discord application and bot token (see [Discord Developer Portal](https://discord.com/developers/applications))
- Access credentials for Battle.net, WarcraftLogs, and WoW Audit APIs (see configuration below)

### Setup Steps

1. **Clone the repository:**
   ```
   git clone https://github.com/Erilla/SeriouslyCasualBot.git
   cd SeriouslyCasualBot
   ```

2. **Create configuration file:**
   Copy `example-config.json` to `config.json` and fill in all 22 values. The file uses `${VARIABLE}` placeholders that must be replaced with real values for local development.
   ```
   cp example-config.json config.json
   ```
   Two values have defaults and do not need environment variable replacement:
   - `applicationCloneDelay`: `2000` (hardcoded integer, not a placeholder)
   - `databaseString`: `"sqlite://./db.sqlite"` (hardcoded string, not a placeholder)

3. **Install dependencies:**
   ```
   npm install
   ```

4. **Start the bot:**
   ```
   npm run start
   ```
   This runs `node .` which executes `index.js`.

5. **Development with auto-restart:**
   ```
   npm run watch
   ```
   This runs `npx nodemon -x "npm run start"`, restarting the bot automatically when any file changes.

6. **Production watch (clean install + watch):**
   ```
   npm run watch-prod
   ```
   This runs `rm -rf node_modules && npm install && npx nodemon -x "npm run start"`.

### npm Scripts Reference

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `node .` | Start the bot |
| `watch` | `npx nodemon -x "npm run start"` | Start with auto-restart on file changes |
| `watch-prod` | `rm -rf node_modules && npm install && npx nodemon -x "npm run start"` | Clean install then auto-restart |
| `test` | `echo "Error: no test specified" && exit 1` | No-op (no test suite exists) |

### Linting

```
npx eslint .
```

ESLint configuration is defined in `.eslintrc.json`. See [01-architecture-overview.md](01-architecture-overview.md) for the full rule set.

---

## Configuration Reference

The `config.json` file contains all runtime configuration. On the production server this file is generated from `example-config.json` by the deploy workflow (see below). For local development, create it manually.

### All Configuration Keys

| Key | Type | Env Variable Placeholder | Description |
|-----|------|--------------------------|-------------|
| `clientId` | string | `${CLIENT_ID}` | Discord application (bot) client ID |
| `guildId` | string | `${GUILD_ID}` | Discord server (guild) ID |
| `token` | string | `${TOKEN}` | Discord bot authentication token |
| `guildInfoChannelId` | string | `${GUILD_INFO_CHANNEL_ID}` | Channel for guild info embeds (About Us, Schedule, etc.) |
| `applicationChannelUrl` | string | `${APPLICATION_CHANNEL_URL}` | URL to the application channel (used in recruitment "Apply Here" button) |
| `adminRoleId` | string | `${ADMIN_ROLE_ID}` | Discord role ID for admin permissions on commands |
| `applicationsCategoryId` | string | `${APPLICATION_CATEGORY_ID}` | Category ID where new application channels appear |
| `applicationsViewerChannelId` | string | `${APPLICATION_VIEWER_CHANNEL_ID}` | Channel where application copies are posted |
| `applicationCloneDelay` | integer | N/A (hardcoded: `2000`) | Delay in ms before cloning application content |
| `databaseString` | string | N/A (hardcoded: `"sqlite://./db.sqlite"`) | SQLite connection string for Keyv |
| `trialReviewChannelId` | string | `${TRIAL_REVIEW_CHANNEL_ID}` | Channel for trial review threads |
| `warcraftLogsClientId` | string | `${WARCRAFTLOGS_CLIENT_ID}` | WarcraftLogs API OAuth2 client ID |
| `warcraftLogsClientSecret` | string | `${WARCRAFTLOGS_CLIENT_SECRET}` | WarcraftLogs API OAuth2 client secret |
| `wowAuditApiSecret` | string | `${WOWAUDIT_API_SECRET}` | WoW Audit API authorization secret |
| `raidersLoungeChannelId` | string | `${RAIDERSLOUNGE_CHANNEL_ID}` | Channel for raid signup alert messages |
| `raiderJson` | string | N/A (hardcoded: `"raiders.json"`) | Filename for auto-generated raider backup in `data/` |
| `lootChannelId` | string | `${LOOT_CHANNEL_ID}` | Channel for loot priority posts |
| `weeklyCheckChannelId` | string | `${WEEKLY_CHECK_CHANNEL_ID}` | Channel for weekly M+ and vault report attachments |
| `priorityLootChannelId` | string | `${PRIORITY_LOOT_CHANNEL_ID}` | Channel for EPGP priority ranking messages |
| `bnetClientId` | string | `${BNET_CLIENT_ID}` | Battle.net API client ID (deprecated service) |
| `bnetClientSecret` | string | `${BNET_CLIENT_SECRET}` | Battle.net API client secret (deprecated service) |
| `botSetupChannelId` | string | `${BOT_SETUP_CHANNEL_ID}` | Channel for bot operational messages (sync alerts, missing user prompts) |

**Note:** `raiderJson` and `applicationCloneDelay` and `databaseString` are not injected via environment variables -- they are hardcoded directly in `example-config.json`.

---

## GitHub Actions Workflows

The project uses four GitHub Actions workflows located in `.github/workflows/`.

### Deploy Workflow (`main.yml`)

**Purpose:** Build `config.json` from environment secrets and upload the entire project to the production server via SFTP.

**Trigger:** `workflow_dispatch` only (manual trigger from the GitHub Actions tab).

**Environment:** `Prod` (GitHub environment -- secrets are scoped to this environment).

**Runner:** `ubuntu-latest`

**Steps:**

| Step | Action | Description |
|------|--------|-------------|
| 1 | `actions/checkout@master` | Check out the repository |
| 2 | `franzbischoff/replace_envs@v1` | Replace `${VAR}` placeholders in `example-config.json`, write result to `config.json` |
| 3 | `ls` | List output files (debug/verification) |
| 4 | `wlixcc/SFTP-Deploy-Action@v1.2.4` | Upload all files (`local_path: ./*`) to the remote server (`remote_path: ./`) via SFTP on port 22 |

**Environment Variable Mappings (19 variables):**

The `replace_envs` step maps GitHub secrets to environment variables that match the `${VAR}` placeholders in `example-config.json`:

| # | Environment Variable | GitHub Secret Reference |
|---|---------------------|------------------------|
| 1 | `CLIENT_ID` | `${{ secrets.CLIENT_ID }}` |
| 2 | `GUILD_ID` | `${{ secrets.GUILD_ID }}` |
| 3 | `TOKEN` | `${{ secrets.TOKEN }}` |
| 4 | `GUILD_INFO_CHANNEL_ID` | `${{ secrets.GUILD_INFO_CHANNEL_ID }}` |
| 5 | `APPLICATION_CHANNEL_URL` | `${{ secrets.APPLICATION_CHANNEL_URL }}` |
| 6 | `ADMIN_ROLE_ID` | `${{ secrets.ADMIN_ROLE_ID }}` |
| 7 | `APPLICATION_CATEGORY_ID` | `${{ secrets.APPLICATION_CATEGORY_ID }}` |
| 8 | `APPLICATION_VIEWER_CHANNEL_ID` | `${{ secrets.APPLICATION_VIEWER_CHANNEL_ID }}` |
| 9 | `TRIAL_REVIEW_CHANNEL_ID` | `${{ secrets.TRIAL_REVIEW_CHANNEL_ID }}` |
| 10 | `WARCRAFTLOGS_CLIENT_ID` | `${{ secrets.WARCRAFTLOGS_CLIENT_ID }}` |
| 11 | `WARCRAFTLOGS_CLIENT_SECRET` | `${{ secrets.WARCRAFTLOGS_CLIENT_SECRET }}` |
| 12 | `WOWAUDIT_API_SECRET` | `${{ secrets.WOWAUDIT_API_SECRET }}` |
| 13 | `RAIDERSLOUNGE_CHANNEL_ID` | `${{ secrets.RAIDERSLOUNGE_CHANNEL_ID }}` |
| 14 | `LOOT_CHANNEL_ID` | `${{ SECRETS.LOOT_CHANNEL_ID }}` |
| 15 | `WEEKLY_CHECK_CHANNEL_ID` | `${{ SECRETS.WEEKLY_CHECK_CHANNEL_ID }}` |
| 16 | `PRIORITY_LOOT_CHANNEL_ID` | `${{ SECRETS.PRIORITY_LOOT_CHANNEL_ID }}` |
| 17 | `BNET_CLIENT_ID` | `${{ SECRETS.BNET_CLIENT_ID }}` |
| 18 | `BNET_CLIENT_SECRET` | `${{ SECRETS.BNET_CLIENT_SECRET }}` |
| 19 | `BOT_SETUP_CHANNEL_ID` | `${{ SECRETS.BOT_SETUP_CHANNEL_ID }}` |

**Note:** Variables 14-19 use `SECRETS` (uppercase) instead of `secrets` (lowercase) in the workflow file. GitHub Actions treats these identically, but the inconsistent casing is worth noting.

**SFTP Configuration:**

| Parameter | Value / Secret |
|-----------|---------------|
| `username` | `${{ secrets.FTP_USERNAME }}` |
| `server` | `${{ secrets.FTP_SERVER }}` |
| `port` | `22` |
| `ssh_private_key` | `${{ secrets.FTP_PRIVATE_KEY }}` |
| `local_path` | `./*` |
| `remote_path` | `./` |

**Required GitHub Secrets for Deploy:**

All 19 config variables listed above, plus 3 SFTP secrets:
- `FTP_USERNAME`
- `FTP_SERVER`
- `FTP_PRIVATE_KEY`

Total: 22 GitHub secrets required.

---

### Restart Workflow (`restart.yml`)

**Purpose:** Stop the bot process, install/update dependencies, and restart the bot on the production server.

**Trigger:** Two triggers:
1. `workflow_dispatch` -- manual trigger from the GitHub Actions tab
2. `workflow_run` -- automatically triggered when the **Deploy** workflow completes (regardless of success/failure)

**Runner:** `self-hosted` -- this runs on the same server that hosts the bot. The self-hosted runner must be installed and registered on the production server.

**Steps (sequential):**

| Step | Name | Command | Working Directory |
|------|------|---------|-------------------|
| 1 | `stop service` | `pm2 stop all` | default |
| 2 | `npm install` | `npm install` | `/root/` |
| 3 | `start service` | `pm2 start all` | default |

**PM2 Process Manager:**

The bot runs under [PM2](https://pm2.keymetrics.io/) in production. PM2 provides:
- Process management (start/stop/restart)
- Automatic restart on crash
- Log management

The PM2 ecosystem configuration is expected to exist on the server (not in the repository). The `pm2 start all` command starts all processes defined in the PM2 configuration.

**Important:** The `npm install` step runs in `/root/`, indicating the bot is deployed to the root user's home directory on the production server.

---

### Claude Code Review Workflow (`claude-code-review.yml`)

**Purpose:** Automated code review on pull requests using Claude AI.

**Trigger:** `pull_request` events: `opened`, `synchronize`, `ready_for_review`, `reopened`

**Runner:** `ubuntu-latest`

**Permissions:**
- `contents: read`
- `pull-requests: read`
- `issues: read`
- `id-token: write`

**Action:** `anthropics/claude-code-action@v1`

**Configuration:**
- Uses `CLAUDE_CODE_OAUTH_TOKEN` secret for authentication
- Plugin marketplace: `https://github.com/anthropics/claude-code.git`
- Plugin: `code-review@claude-code-plugins`
- Prompt: `/code-review:code-review ${{ github.repository }}/pull/${{ github.event.pull_request.number }}`

---

### Claude Code Workflow (`claude.yml`)

**Purpose:** Respond to `@claude` mentions in issues and pull requests.

**Trigger:** Four event types:
- `issue_comment` (created)
- `pull_request_review_comment` (created)
- `issues` (opened, assigned)
- `pull_request_review` (submitted)

**Condition:** Only runs if the event body/comment/title contains `@claude`.

**Runner:** `ubuntu-latest`

**Permissions:**
- `contents: read`
- `pull-requests: read`
- `issues: read`
- `id-token: write`
- `actions: read` (for reading CI results on PRs)

**Action:** `anthropics/claude-code-action@v1` with `CLAUDE_CODE_OAUTH_TOKEN` secret.

---

### Dependabot (`dependabot.yml`)

**Purpose:** Automated dependency update checks.

**Configuration:**
- Package ecosystem: `npm`
- Directory: `/`
- Schedule interval: `daily`

Dependabot will create pull requests for outdated npm dependencies on a daily basis.

---

## Deployment Flow

The complete deployment process from code change to running bot:

```
Developer pushes to main / merges PR
            |
            v
   Manual trigger of Deploy workflow
            |
            v
   [Deploy Workflow - ubuntu-latest]
   1. Checkout repository
   2. Replace env vars: example-config.json -> config.json
   3. SFTP upload all files to production server
            |
            v
   [Restart Workflow - self-hosted runner on production server]
   (triggered automatically by Deploy completion)
   1. pm2 stop all
   2. npm install (in /root/)
   3. pm2 start all
            |
            v
   Bot starts: index.js
   1. Load commands from commands/
   2. Register slash commands with Discord (guild-scoped)
   3. Load event handlers from events/
   4. Login to Discord
   5. ready event fires -> all scheduled tasks initialize
```

---

## Production Server

Based on the workflow configuration:

- **OS:** Linux (inferred from `/root/` working directory and self-hosted runner)
- **Process manager:** PM2
- **Deployment directory:** `/root/` (the bot files are in the root user's home directory)
- **Runner:** A GitHub Actions self-hosted runner is installed on the same server
- **Access:** SFTP on port 22 via SSH private key authentication
- **Database:** SQLite file at `./db.sqlite` relative to the bot directory

---

## Required Discord Bot Permissions

The bot must be invited to the Discord server with the following permissions and intents.

### Gateway Intents

| Intent | Required By | Purpose |
|--------|-------------|---------|
| `GatewayIntentBits.Guilds` | `index.js` (Client constructor) | Access to guild data, channels, roles, and members cache |

This is the **only** intent configured. The bot does not use `GuildMessages`, `MessageContent`, or `GuildMembers` privileged intents.

### Bot Permissions

| Permission | Used For |
|------------|----------|
| Send Messages | Posting embeds, alerts, signup reminders, and bot operational messages |
| Read Message History | Reading application messages from channels, fetching existing messages for updates |
| Manage Messages | Suppressing embeds on application posts, deleting messages during guild info refresh, pinning messages |
| Embed Links | All embed-based content (guild info, voting, loot posts, EPGP rankings, trial reviews) |
| Create Public Threads | Creating application discussion threads and trial review threads |
| Send Messages in Threads | Posting in application and trial review threads |
| Manage Threads | Setting auto-archive duration, archiving/unarchiving threads |
| Use External Emojis | Displaying custom emojis in embeds (alliance icon, KEKW, RaiderIO, WoWProgress, WarcraftLogs icons) |
| Use External Stickers | Companion to external emoji permission |
| Add Reactions | Potential reaction-based features |

### Slash Command Permissions

Two commands use `setDefaultPermission(false)` and define a `permissions` array with the `adminRoleId` from config:

| Command | Permission Restriction |
|---------|----------------------|
| `/guildinfo` | Only usable by members with the `adminRoleId` role |
| `/updateachievements` | Only usable by members with the `adminRoleId` role |

The permissions are defined as:
```
{
    id: adminRoleId,
    type: 1,          // 1 = ROLE
    permission: true
}
```

All other commands have default permissions (usable by anyone with access to the channel).

**Note:** There are also hardcoded admin role IDs in `events/interactionCreate.js` used for button permission checks: `['255630010088423425', '170611904752910336']`. These are separate from the config `adminRoleId` and are checked when handling the `acceptedApplicant` and `rejectedApplicant` buttons.

---

## Operational Notes

### Database Backup

The SQLite database (`db.sqlite`) lives on the production server. There is no automated backup mechanism in the workflows. The `data/raiders.json` file serves as a partial backup of the raiders namespace -- it is regenerated by `updateRaiderJsonData()` on every raider add/remove/update and is included in SFTP deployments.

### Logging

All logging is via `console.log` and `console.error`. PM2 captures stdout/stderr to log files. There is no structured logging framework or external log aggregation.

### Error Recovery

- Scheduled `setInterval` tasks are wrapped in try/catch with timestamp-based console.log error messages
- Cron tasks (`node-cron`) have **no** error wrapping
- If the bot crashes, PM2 will automatically restart the process
- The Restart workflow can be manually triggered to reinstall dependencies and restart

### Configuration Changes

Changing configuration values requires:
1. Update the corresponding GitHub secret in the `Prod` environment
2. Run the Deploy workflow (manual trigger)
3. The Restart workflow will automatically trigger after Deploy completes

For values hardcoded in `example-config.json` (`applicationCloneDelay`, `databaseString`, `raiderJson`), a code change and deployment is required.
