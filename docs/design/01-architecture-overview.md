# 01 - Architecture Overview

This document describes the system architecture of SeriouslyCasualBot, a Discord bot for WoW guild management ("Seriously Casual" on EU-Silvermoon). It covers the tech stack, directory layout, startup sequence, layered architecture, domain cross-reference, key architectural patterns, complete configuration reference, and ESLint code style rules.

---

## Tech Stack

All versions are from `package.json` semver ranges.

| Package | Version | Purpose |
|---------|---------|---------|
| discord.js | ^14.8.0 | Discord bot framework (v14 slash commands, buttons, modals, select menus) |
| @discordjs/rest | ^1.0.1 | REST client for registering slash commands via Discord HTTP API |
| discord-api-types | ^0.37.25 | TypeScript-compatible route definitions (used at runtime for `Routes`) |
| keyv | ^4.3.3 | Key-value store abstraction with namespace support |
| @keyv/sqlite | ^3.5.3 | SQLite adapter for Keyv (file-based persistence) |
| axios | ^0.27.2 | HTTP client for Raider.io and EPGP APIs |
| node-fetch | ^2.7.0 | HTTP client for WoW Audit, WarcraftLogs, and Battle.net APIs |
| node-cron | ^3.0.2 | Cron-style scheduling for recurring tasks |
| form-data | ^4.0.0 | Multipart form data (used by WarcraftLogs OAuth) |
| ongoing | ^1.0.2 | ASCII progress bar rendering (used in voting embeds) |
| nodaemon | ^0.0.5 | (Listed but unused -- `nodemon` is used via npx in scripts) |

**Dev Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^8.31.0 | Linting |
| prettier | ^2.8.1 | Formatting (config not present -- likely unused) |

**Runtime:** Node.js with CommonJS modules (`require`/`exports`), not ES modules.

**npm Scripts:**

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `node .` | Start the bot |
| `watch` | `npx nodemon -x "npm run start"` | Auto-restart on file changes |
| `watch-prod` | `rm -rf node_modules && npm install && npx nodemon -x "npm run start"` | Clean install then watch |
| `test` | `echo "Error: no test specified" && exit 1` | No-op placeholder |

---

## Directory Structure

```
SeriouslyCasualBot/
|
|-- index.js                        # Entry point: creates client, loads commands/events, logs in
|-- deploy-commands.js              # Registers slash commands with Discord API
|-- package.json                    # Dependencies and scripts
|-- config.json                     # Runtime configuration (gitignored, copy from example-config.json)
|-- example-config.json             # Template with 23 placeholder keys
|-- .eslintrc.json                  # ESLint rules
|-- db.sqlite                       # SQLite database file (generated at runtime)
|
|-- commands/                       # Slash command definitions (9 files)
|   |-- applicants.js               #   /applicants
|   |-- epgp.js                     #   /epgp
|   |-- guildinfo.js                #   /guildinfo
|   |-- loot.js                     #   /loot
|   |-- raiders.js                  #   /raiders
|   |-- raids.js                    #   /raids
|   |-- settings.js                 #   /settings
|   |-- trials.js                   #   /trials
|   +-- updateAchievements.js       #   /updateachievements
|
|-- events/                         # Discord event handlers (2 files)
|   |-- interactionCreate.js        #   Dispatch hub for commands, buttons, modals, select menus
|   +-- ready.js                    #   Startup tasks and scheduled task initialization
|
|-- functions/                      # Business logic (44+ files across 7 domains)
|   |-- addOverlordsToThread.js     #   Shared utility: adds overlord users to a thread
|   |-- applications/               #   Application pipeline (9 files)
|   |-- epgp/                       #   EPGP priority rankings (1 file)
|   |-- guild-info/                 #   Guild info embeds (5 files)
|   |-- loot/                       #   Loot priority signups (6 files)
|   |-- raids/                      #   Roster management, signups, M+ reports (20 files)
|   |-- settings/                   #   Feature toggles (4 files)
|   +-- trial-review/               #   Trial probation tracking (24 files)
|
|-- services/                       # External API wrappers (4 files)
|   |-- battleNetService.js         #   Battle.net OAuth + roster (DEPRECATED)
|   |-- epgpService.js              #   EPGP priority rankings API
|   |-- raiderioService.js          #   Raider.io guild roster, raid rankings, M+ data
|   +-- wowauditService.js          #   WoW Audit raid signups, historical data
|
|-- data/                           # Static and generated JSON data files (7 files)
|   |-- aboutus.json                #   About Us embed content
|   |-- achievements.json           #   Manual achievement data (expansions 4-5)
|   |-- raiders.json                #   Auto-generated raider backup (name + userId)
|   |-- raidersSeedData.json        #   Initial raider seed data
|   |-- recruitment.json            #   Recruitment embed content with {{OVERLORDS}} token
|   |-- schedule.json               #   Raid schedule embed content
|   +-- signupAlertMessages.json    #   Random signup reminder messages (64 entries)
|
+-- .github/                        # CI/CD workflows
    +-- workflows/
        |-- main.yml                #   Deploy via SFTP
        |-- restart.yml             #   PM2 restart (self-hosted runner)
        |-- claude.yml              #   Claude AI code review
        +-- claude-code-review.yml  #   Claude AI PR review
```

---

## Startup Sequence

The bot starts from `index.js` (35 lines). The following sequence executes in order:

```
+-------------------------------------------------------------------+
|  1. Create Discord Client                                         |
|     new Client({ intents: [GatewayIntentBits.Guilds] })           |
|     - Only the Guilds intent is requested                         |
|     - client.commands = new Collection()                          |
+-------------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------------+
|  2. Load Commands                                                 |
|     fs.readdirSync('./commands').filter(f => f.endsWith('.js'))    |
|     For each file:                                                |
|       command = require(`./commands/${file}`)                      |
|       client.commands.set(command.data.name, command)              |
|     Result: 9 commands in Collection, keyed by name               |
+-------------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------------+
|  3. Register Slash Commands with Discord                          |
|     deployCommands() called synchronously (fire-and-forget)       |
|       - REST({ version: '9' }).setToken(token)                    |
|       - rest.put(Routes.applicationGuildCommands(clientId,guildId))|
|       - Guild-scoped registration (not global)                    |
|       - Runs on every startup (overwrites previous registration)  |
+-------------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------------+
|  4. Load Event Handlers                                           |
|     fs.readdirSync('./events').filter(f => f.endsWith('.js'))      |
|     For each file:                                                |
|       event = require(`./events/${file}`)                          |
|       if (event.once) client.once(event.name, ...)                |
|       else            client.on(event.name, ...)                  |
|     Result: 'ready' (once) and 'interactionCreate' (on) bound    |
+-------------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------------+
|  5. Login                                                         |
|     client.login(token)                                           |
|     Connects to Discord Gateway via WebSocket                     |
+-------------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------------+
|  6. 'ready' Event Fires (once: true)                              |
|     See events/ready.js -- initializes all scheduled tasks:       |
|       a. checkApplications(client)  -- runs once, sets own 5m     |
|          setInterval internally                                   |
|       b. 7 setInterval tasks registered (3m to 60m intervals)     |
|       c. addRaiders(false, false) -- seeds raiders from JSON      |
|       d. 3 node-cron tasks scheduled                              |
|     See doc 12-scheduled-tasks.md for full details.               |
+-------------------------------------------------------------------+
```

### Key Startup Notes

1. **Command registration is fire-and-forget.** `deployCommands()` returns a Promise that is not awaited. Registration happens asynchronously during event handler loading. If it fails, an error is logged via `.catch(console.error)` but startup continues.

2. **Guild-scoped commands.** Commands are registered only for the configured guild via `Routes.applicationGuildCommands(clientId, guildId)`, not globally. This means instant updates (no propagation delay) but commands only work in the target guild.

3. **Single intent.** Only `GatewayIntentBits.Guilds` is requested. This provides access to guild channels, roles, and threads, but not message content or member presence.

4. **Event handler registration uses Stroustrup brace style.** The `if/else` in index.js follows the project's brace-style convention where `else` starts on a new line after `}`.

---

## Layered Architecture

```
+============================================================================+
|                           DISCORD GATEWAY / API                            |
+============================================================================+
        |                           ^                    ^
        | events                    | send messages      | register commands
        v                           |                    |
+------------------------------+    |    +-------------------------------+
|         events/              |    |    |       deploy-commands.js      |
|  interactionCreate.js        |    |    |  REST v9, guild-scoped PUT   |
|  ready.js                    |    |    +-------------------------------+
+------------------------------+    |
        |                           |
        | dispatch                  |
        v                           |
+------------------------------+    |
|         commands/            |    |
|  9 slash command files       |----+
|  Each: { data, execute() }   |    |
+------------------------------+    |
        |                           |
        | call                      |
        v                           |
+============================================================================+
|                         functions/ (Business Logic)                         |
|                                                                            |
|  applications/  epgp/  guild-info/  loot/  raids/  settings/  trial-review/|
|                                                                            |
|  Each file: one exported function, own Keyv instance, direct config import |
+============================================================================+
        |                    |
        | HTTP calls         | read/write
        v                    v
+--------------------+  +--------------------+
|    services/       |  |    SQLite (Keyv)    |
| raiderioService    |  |    14 namespaces    |
| wowauditService    |  |    db.sqlite        |
| epgpService        |  +--------------------+
| battleNetService   |
+--------------------+
        |
        v
+--------------------+
|  External APIs     |
| Raider.io          |
| WoW Audit          |
| EPGP API           |
| WarcraftLogs       |
| Battle.net (deprecated) |
+--------------------+
```

### Data Flow Patterns

**Command flow:** Discord interaction --> `interactionCreate.js` --> `commands/*.js` --> `functions/**/*.js` --> services/Keyv

**Scheduled task flow:** `ready.js` setInterval/cron --> `functions/**/*.js` --> services/Keyv --> Discord channels (send messages)

**Button/Modal flow:** Discord interaction --> `interactionCreate.js` --> `functions/**/*.js` directly (bypasses commands/)

---

## Domain Cross-Reference Table

| Domain | Command File | Function Directory | Service Dependencies | Keyv Namespaces | Scheduled Tasks |
|--------|-------------|-------------------|---------------------|----------------|----------------|
| Applications | `commands/applicants.js` | `functions/applications/` (9 files) | None | openApplications, openApplicationThreads, applicationVotes | checkApplications (5m, internal), keepApplicationThreadsAlive (3m) |
| Trial Review | `commands/trials.js` | `functions/trial-review/` (24 files) | WarcraftLogs (in getTrialLogs.js) | trials, trialAlerts, promoteAlerts | checkForReviewAlerts (3m), alertPromotions (5m), keepTrialThreadsAlive (6m), updateTrialLogs (60m) |
| Raids | `commands/raiders.js`, `commands/raids.js` | `functions/raids/` (20 files) | raiderioService, wowauditService | raiders, raidersRealms, overlords, ignoredCharacters | syncRaiders (10m), alertSignups (cron), alertHighestMythicPlusDone (cron) |
| Loot | `commands/loot.js` | `functions/loot/` (6 files) | raiderioService | lootResponses, raiders (read-only) | None |
| EPGP | `commands/epgp.js` | `functions/epgp/` (1 file) | epgpService | priorityLootPostConfig | updatePriorityRankingPost (cron */10) |
| Guild Info | `commands/guildinfo.js`, `commands/updateAchievements.js` | `functions/guild-info/` (5 files) | raiderioService | guildinfo, overlords (read-only) | updateAchievements (30m) |
| Settings | `commands/settings.js` | `functions/settings/` (4 files) | None | settings | None |

### Shared Utility

**`functions/addOverlordsToThread.js`** -- Iterates all entries in the `overlords` namespace and calls `thread.members.add(userId)` for each. Used by both the Applications domain (after application thread creation) and the Trial Review domain (after trial review thread creation).

---

## Key Architectural Patterns

### One Exported Function Per File

Each file in `functions/` typically exports a single function (some export 2-4 related functions). Functions are small and focused, averaging 20-50 lines.

### Per-File Keyv Instances

Every file that needs database access creates its own Keyv instance at module scope:

```javascript
const { databaseString } = require('../../config.json');
const Keyv = require('keyv');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', err => console.error('Keyv connection error:', err));
```

There is no shared database module or connection pool. Multiple files may create instances for the same namespace -- Keyv handles this because SQLite allows multiple connections.

### Client Passed as Parameter

The Discord `client` object is passed from event handlers down through the call chain:

```
ready.js: execute(client) --> keepTrialThreadsAlive(client)
interactionCreate.js: execute(interaction) --> interaction.client
```

Functions that need to send messages or fetch channels receive `client` as their first parameter.

### Direct Config Imports

Each file imports the specific config keys it needs directly:

```javascript
const { trialReviewChannelId, databaseString } = require('../../config.json');
```

There is no centralized config module or environment variable abstraction.

### No Dependency Injection

All dependencies (Keyv instances, config values, service functions) are resolved at module load time via `require()`. There is no DI framework or factory pattern.

### Hardcoded Discord IDs

Some Discord IDs are hardcoded directly in function files rather than coming from config:
- Admin role IDs in `interactionCreate.js` line 33: `['255630010088423425', '170611904752910336']`
- Admin role ID in `alertPromotions.js` line 3: `'255630010088423425'`
- WarcraftLogs guild ID in `getTrialLogs.js`: `486913`
- Raider.io guild ID in `raiderioService.js`: `'1061585%2C43113'`
- Signup alert channel in `alertSignups.js`: `'980016906620776528'`
- KekW emoji ID in `generateVotingMessage.js`: `'777828455735230474'`

### Error Handling

Two error patterns are used throughout:

1. **Catch-and-log** (most common): `.catch(err => console.error(err))` or `.catch(console.error)`
2. **Catch-and-return** (services): `.catch((error) => error)` returns the error as the resolved value, allowing callers to check for error properties

Scheduled tasks in `ready.js` wrap each execution in `try/catch` with timestamped console.log messages. Cron tasks have no error wrapping.

---

## Complete Configuration Reference

All 23 keys from `example-config.json` with descriptions and consumers.

| # | Key | Type | Default | Description | Consumer Files |
|---|-----|------|---------|-------------|---------------|
| 1 | `clientId` | string | -- | Discord application (bot) client ID | `deploy-commands.js` |
| 2 | `guildId` | string | -- | Discord guild (server) ID | `deploy-commands.js` |
| 3 | `token` | string | -- | Discord bot token | `index.js`, `deploy-commands.js` |
| 4 | `guildInfoChannelId` | string | -- | Channel ID where guild info embeds are posted | `clearGuildInfo.js`, `updateAboutUs.js`, `updateSchedule.js`, `updateRecruitment.js`, `updateAchievements.js` |
| 5 | `applicationChannelUrl` | string | -- | URL to the guild's application form (used in recruitment embed "Apply Here" button) | `updateRecruitment.js` |
| 6 | `adminRoleId` | string | -- | Discord role ID for admin/officer role (used in config but note: hardcoded separately in interactionCreate.js and alertPromotions.js) | `guildinfo.js` command permission check |
| 7 | `applicationsCategoryId` | string | -- | Discord category channel ID where new applications appear | `checkApplications.js` |
| 8 | `applicationsViewerChannelId` | string | -- | Channel ID where application copies are posted for review | `copyApplicationToViewer.js`, `archiveApplicationThread.js` |
| 9 | `applicationCloneDelay` | number | 2000 | Milliseconds to wait before copying a new application (lets Discord finish creating it) | `copyApplicationToViewer.js` |
| 10 | `databaseString` | string | `sqlite://./db.sqlite` | Keyv connection string for SQLite database | Every file that creates a `new Keyv(...)` instance (40+ files) |
| 11 | `trialReviewChannelId` | string | -- | Channel ID where trial review threads are created | `createTrialReviewThread.js`, `changeTrialInfo.js`, `alertPromotions.js`, `markToPromote.js`, `alertTrialReview.js` |
| 12 | `warcraftLogsClientId` | string | -- | WarcraftLogs API OAuth2 client ID | `getTrialLogs.js` |
| 13 | `warcraftLogsClientSecret` | string | -- | WarcraftLogs API OAuth2 client secret | `getTrialLogs.js` |
| 14 | `wowAuditApiSecret` | string | -- | WoW Audit API authorization token | `wowauditService.js` |
| 15 | `raidersLoungeChannelId` | string | -- | Channel ID for raiders lounge (used in signup alerts) | `alertSignups.js` |
| 16 | `raiderJson` | string | `raiders.json` | Filename for raider data backup in `data/` directory | `addRaiders.js`, `updateRaiderJsonData.js` |
| 17 | `lootChannelId` | string | -- | Channel ID where loot priority posts are created | `checkRaidExpansions.js` (via loot command) |
| 18 | `weeklyCheckChannelId` | string | -- | Channel ID where weekly M+ and Great Vault reports are posted | `alertHighestMythicPlusDone.js` |
| 19 | `priorityLootChannelId` | string | -- | Channel ID where EPGP priority ranking messages are posted | `priorityRankingPost.js` |
| 20 | `bnetClientId` | string | -- | Battle.net API OAuth2 client ID (DEPRECATED) | `battleNetService.js` |
| 21 | `bnetClientSecret` | string | -- | Battle.net API OAuth2 client secret (DEPRECATED) | `battleNetService.js` |
| 22 | `botSetupChannelId` | string | -- | Channel ID for bot admin messages (missing user alerts, sync summaries) | `syncRaiders.js`, `sendAlertForRaidersWithNoUser.js` |
| 23 | `applicationCloneDelay` | -- | -- | (Already listed as #9 above. There are 22 unique keys total; the example-config.json has 23 lines but `applicationCloneDelay` is key #9.) | -- |

**Note:** The example-config.json contains exactly 22 unique keys. Keys 20-21 (`bnetClientId`, `bnetClientSecret`) are for the deprecated Battle.net service that has been replaced by Raider.io.

---

## ESLint Rules

Configured in `.eslintrc.json`, extends `eslint:recommended` with Node.js + ES6 environment and `ecmaVersion: 2021`.

### Formatting Rules

| Rule | Setting | Effect |
|------|---------|--------|
| `indent` | `["error", "tab", { "SwitchCase": 1 }]` | Tabs for indentation, switch cases indented 1 level |
| `quotes` | `["error", "single"]` | Single quotes required |
| `semi` | `["error", "always"]` | Semicolons required |
| `comma-dangle` | `["error", "always-multiline"]` | Trailing commas in multiline constructs |
| `brace-style` | `["error", "stroustrup", { "allowSingleLine": true }]` | Stroustrup style: `else` on new line after `}` |
| `object-curly-spacing` | `["error", "always"]` | Spaces inside braces: `{ key: value }` |
| `space-before-function-paren` | `["error", { "anonymous": "never", "named": "never", "asyncArrow": "always" }]` | No space before `(` in named/anonymous functions; space required in `async () =>` |
| `no-trailing-spaces` | `["error"]` | No trailing whitespace |
| `no-multiple-empty-lines` | `["error", { "max": 2, "maxEOF": 1, "maxBOF": 0 }]` | Max 2 consecutive blank lines |

### Code Quality Rules

| Rule | Setting | Effect |
|------|---------|--------|
| `no-var` | `"error"` | Must use `const` or `let`, never `var` |
| `prefer-const` | `"error"` | Use `const` when variable is never reassigned |
| `no-empty-function` | `"error"` | No empty function bodies |
| `no-inline-comments` | `"error"` | Comments must be on their own line |
| `no-lonely-if` | `"error"` | No `if` as only statement in `else` block |
| `no-shadow` | `["error", { "allow": ["err", "resolve", "reject"] }]` | No variable shadowing, except `err`/`resolve`/`reject` |
| `max-nested-callbacks` | `["error", { "max": 4 }]` | Maximum 4 levels of nested callbacks |
| `max-statements-per-line` | `["error", { "max": 2 }]` | Maximum 2 statements per line |
| `no-console` | `"off"` | Console statements allowed (logging throughout) |
| `no-floating-decimal` | `"error"` | No `.5` or `5.` -- must be `0.5` or `5.0` |
| `curly` | `["error", "multi-line", "consistent"]` | Braces required for multi-line blocks, consistent within if/else |
| `yoda` | `"error"` | No Yoda conditions (`if (value === 5)`, not `if (5 === value)`) |

### Spacing Rules

| Rule | Setting |
|------|---------|
| `arrow-spacing` | `{ "before": true, "after": true }` |
| `comma-spacing` | `"error"` (default: space after, none before) |
| `comma-style` | `"error"` (default: comma at end of line) |
| `dot-location` | `["error", "property"]` (dot on same line as property) |
| `keyword-spacing` | `"error"` (space before and after keywords) |
| `space-before-blocks` | `"error"` (space before `{`) |
| `space-in-parens` | `"error"` (no spaces inside parentheses) |
| `space-infix-ops` | `"error"` (spaces around operators) |
| `space-unary-ops` | `"error"` (space after word operators, none for non-word) |
| `spaced-comment` | `"error"` (space after `//` or `/*`) |
| `no-multi-spaces` | `"error"` |

### Example: Properly Formatted Code

```javascript
const { databaseString } = require('../../config.json');
const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function createTrial(client, trial) {
	const existingTrial = await trials
		.get(trial.threadId)
		.catch(err => console.error(err));

	if (existingTrial) {
		// Update the existing trial
		await trials.set(trial.threadId, {
			...existingTrial,
			characterName: trial.characterName ?? existingTrial.characterName,
		});
	}
	else {
		// Create a new trial
		await trials.set(trial.threadId, trial);
	}
}

exports.createTrial = createTrial;
```

Key observations:
- Tab indentation
- Single quotes everywhere
- Semicolons at end of statements
- Trailing comma after last property in multiline objects
- Stroustrup brace style: `else` on new line after closing `}`
- Spaces inside `{ }` for objects
- No space before `(` in named function
- Comments on their own line, not inline
