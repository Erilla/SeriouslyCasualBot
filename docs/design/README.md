# SeriouslyCasualBot -- Design Documentation

Specification-level design documents for the SeriouslyCasualBot Discord bot. These documents contain sufficient detail to rebuild the entire system from scratch, including exact data structures, algorithms, API specifications, Discord component configurations, constants, and code patterns.

---

## Project Summary

SeriouslyCasualBot is a Discord bot for the World of Warcraft guild **Seriously Casual** on EU-Silvermoon. It manages guild applications, trial reviews, raid roster syncing, loot priority signups, EPGP rankings, and guild information displays.

**Tech stack:** Discord.js v14, Node.js, SQLite via Keyv, axios/node-fetch for HTTP, node-cron for scheduling. CommonJS modules throughout. Deployed via GitHub Actions (SFTP upload) and managed with PM2 on a Linux server.

---

## Reading Paths

Different audiences should start with different documents depending on their goals.

| Audience | Start Here | Then Read |
|----------|-----------|-----------|
| **New developer** (onboarding) | [01 Architecture Overview](01-architecture-overview.md) | [02 Interaction Routing](02-interaction-routing.md), [11 Database Schema](11-database-schema.md), [12 Scheduled Tasks](12-scheduled-tasks.md) |
| **Feature owner** (working on a specific domain) | The relevant domain doc (03-09) | [02 Interaction Routing](02-interaction-routing.md), [10 Services and APIs](10-services-and-apis.md), [11 Database Schema](11-database-schema.md) |
| **Deployer / ops** (setting up or maintaining the bot) | [13 Deployment and Operations](13-deployment-and-operations.md) | [01 Architecture Overview](01-architecture-overview.md) (configuration reference), [15 Data Files](15-data-files.md) |
| **API debugger** (troubleshooting external integrations) | [10 Services and APIs](10-services-and-apis.md) | The relevant domain doc that consumes the service |
| **Command author** (adding or modifying slash commands) | [14 Command Reference](14-command-reference.md) | [02 Interaction Routing](02-interaction-routing.md), the relevant domain doc |
| **Data editor** (updating guild info, messages, achievements) | [15 Data Files](15-data-files.md) | [08 Guild Info](08-domain-guild-info.md) |

---

## Document Map

| # | Document | Description |
|---|----------|-------------|
| 01 | [Architecture Overview](01-architecture-overview.md) | Tech stack, startup sequence, directory structure, configuration reference, ESLint rules, cross-domain reference |
| 02 | [Interaction Routing](02-interaction-routing.md) | The interactionCreate.js dispatch hub: button, modal, select menu, and command routing with all customId catalogs |
| 03 | [Domain: Applications](03-domain-applications.md) | Application detection, copy pipeline, voting system, thread maintenance, and cross-domain bridge to trials |
| 04 | [Domain: Trial Review](04-domain-trial-review.md) | Trial lifecycle, date calculations, alert system, WarcraftLogs integration, modal fields, thread management |
| 05 | [Domain: Raids](05-domain-raids.md) | Roster sync algorithm, startup seeding, signup alerts, M+ and vault reports, overlord and ignore management |
| 06 | [Domain: Loot](06-domain-loot.md) | Raid auto-discovery, loot post generation, response tracking, button-driven priority signups |
| 07 | [Domain: EPGP](07-domain-epgp.md) | Three-message architecture, column formatting, filtering by tier token or armour type, auto-update cron |
| 08 | [Domain: Guild Info](08-domain-guild-info.md) | About Us, Schedule, Recruitment, and Achievements embed generation with full refresh sequence |
| 09 | [Domain: Settings](09-domain-settings.md) | Feature toggle system for signup alert controls |
| 10 | [Services and APIs](10-services-and-apis.md) | Raider.io, WoW Audit, EPGP, WarcraftLogs, and Battle.net API wrappers with endpoints, auth, and error patterns |
| 11 | [Database Schema](11-database-schema.md) | All 14 Keyv namespaces with key/value shapes, readers, writers, and cross-namespace relationships |
| 12 | [Scheduled Tasks](12-scheduled-tasks.md) | All setInterval and node-cron tasks with intervals, functions, domains, and error handling |
| 13 | [Deployment and Operations](13-deployment-and-operations.md) | Local dev setup, GitHub Actions workflows (deploy, restart, code review), PM2, Discord permissions |
| 14 | [Command Reference](14-command-reference.md) | Complete slash command catalog: 9 command groups, 30 subcommands, all options, response types, and known bugs |
| 15 | [Data Files](15-data-files.md) | All 7 JSON data files: structures, consumers, writers, template tokens, and editing guide |

---

## Conventions

The following conventions are used throughout these documents:

- **File paths** are relative to the project root (e.g., `commands/loot.js` means `<project-root>/commands/loot.js`)
- **Keyv namespaces** are written in backticks (e.g., `raiders`, `trials`, `settings`)
- **Timing values** include both human-readable and millisecond forms (e.g., "3 minutes / 180,000ms")
- **Discord IDs** (channel, role, user, emoji) are shown as string literals where they appear in code
- **Config references** use the JSON key name from `config.json` (e.g., `trialReviewChannelId`)
- **Code snippets** show the exact patterns used in the source, including any quirks or bugs
- **Known issues** are called out explicitly where they exist (e.g., the `remove_overlord`/`remove_overlords` mismatch)
- **Cross-references** between documents use relative Markdown links (e.g., `[02 Interaction Routing](02-interaction-routing.md)`)

---

## Source Code to Document Mapping

For reference, this table maps primary source files to their covering design document.

| Source File(s) | Document |
|---------------|----------|
| `index.js`, `deploy-commands.js`, `package.json`, `example-config.json`, `.eslintrc.json` | [01 Architecture Overview](01-architecture-overview.md) |
| `events/interactionCreate.js` | [02 Interaction Routing](02-interaction-routing.md) |
| `functions/applications/*.js`, `commands/applicants.js` | [03 Domain: Applications](03-domain-applications.md) |
| `functions/trial-review/*.js`, `commands/trials.js` | [04 Domain: Trial Review](04-domain-trial-review.md) |
| `functions/raids/*.js`, `commands/raiders.js`, `commands/raids.js` | [05 Domain: Raids](05-domain-raids.md) |
| `functions/loot/*.js`, `commands/loot.js` | [06 Domain: Loot](06-domain-loot.md) |
| `functions/epgp/*.js`, `commands/epgp.js` | [07 Domain: EPGP](07-domain-epgp.md) |
| `functions/guild-info/*.js`, `commands/guildinfo.js`, `commands/updateAchievements.js` | [08 Domain: Guild Info](08-domain-guild-info.md) |
| `functions/settings/*.js`, `commands/settings.js` | [09 Domain: Settings](09-domain-settings.md) |
| `services/*.js`, `functions/trial-review/getTrialLogs.js` | [10 Services and APIs](10-services-and-apis.md) |
| All files using `new Keyv(...)` | [11 Database Schema](11-database-schema.md) |
| `events/ready.js` | [12 Scheduled Tasks](12-scheduled-tasks.md) |
| `.github/workflows/*.yml`, `package.json`, `example-config.json` | [13 Deployment and Operations](13-deployment-and-operations.md) |
| `commands/*.js` (all 9 files) | [14 Command Reference](14-command-reference.md) |
| `data/*.json` (all 7 files) | [15 Data Files](15-data-files.md) |
