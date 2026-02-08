# Discord Commands

All slash commands, button interactions, modal submissions, and select menus available in the bot.

Commands are registered as **guild commands** (not global) via `deploy-commands.js` using `Routes.applicationGuildCommands(clientId, guildId)`. All command files live in `commands/` and export `{ data: SlashCommandBuilder, execute(interaction), permissions? }`.

Interaction routing for non-command interactions (buttons, modals, selects) is in `events/interactionCreate.js`.

---

## Slash Commands

### `/applicants` — `commands/applicants.js`

Application management commands.

| Subcommand | Options | Response | Description |
|------------|---------|----------|-------------|
| `create_voting_message` | `thread_id` (string, required) | Ephemeral | Manually creates/recreates a voting message in the specified application thread |

---

### `/trials` — `commands/trials.js`

Trial (probation) management commands.

| Subcommand | Options | Response | Description |
|------------|---------|----------|-------------|
| `create_thread` | None | Opens modal | Opens trial info modal to create a new trial review thread |
| `get_current_trials` | None | Ephemeral | Lists all active trials with thread IDs and data |
| `remove_trial` | `thread_id` (string, required) | Ephemeral | Removes trial from DB (deletes from `trials` and `trialAlerts`) |
| `change_trial_info` | `thread_id` (string, required), `character_name` (string, optional), `role` (string, optional), `start_date` (string, optional) | Ephemeral | Updates trial info with partial merge (nullish coalescing) |
| `update_trial_logs` | None | Ephemeral | Refreshes WarcraftLogs links for all active trials |
| `update_trial_review_messages` | None | Ephemeral | Updates all trial review messages with current content and buttons |

---

### `/raiders` — `commands/raiders.js`

Guild roster and officer management. 12 subcommands.

| Subcommand | Options | Response | Description |
|------------|---------|----------|-------------|
| `get_raiders` | None | Ephemeral | Lists all raiders with realm and Discord user ID |
| `get_ignored_characters` | None | Ephemeral | Lists all blacklisted characters |
| `ignore_character` | `character_name` (string, required) | Ephemeral | Removes raider and adds to ignore list |
| `remove_ignore_character` | `character_name` (string, required) | Ephemeral | Removes character from ignore list |
| `sync_raiders` | None | Ephemeral | Triggers manual sync with Raider.io roster, returns updated list |
| `check_missing_users` | None | Ephemeral | Posts UserSelectMenu alerts for raiders with no linked Discord user |
| `update_raider_user` | `character_name` (string, required), `user` (User, required) | Ephemeral | Links a character name to a Discord user |
| `previous_highest_mythicplus` | None | Public (edits reply) | Fetches WoW Audit historical data, returns M+ completions as .txt file |
| `previous_great_vault` | None | Public (edits reply) | Fetches WoW Audit historical data, returns vault options as .txt file |
| `add_overlord` | `name` (string, required), `user` (User, required) | Ephemeral | Adds a guild officer |
| `get_overlords` | None | Ephemeral | Lists all officers with Discord user IDs |
| `remove_overlord` | `name` (string, required) | Ephemeral | Removes a guild officer |

---

### `/raids` — `commands/raids.js`

Raid event commands.

| Subcommand | Options | Response | Description |
|------------|---------|----------|-------------|
| `alert_signups` | None | Ephemeral | Manually triggers signup alert for next raid |

---

### `/loot` — `commands/loot.js`

Loot priority management. Also bridges to EPGP priority post.

| Subcommand | Options | Response | Description |
|------------|---------|----------|-------------|
| `add_post` | None | Ephemeral | Creates a test loot post (hardcoded boss: id 1, "Test Boss") |
| `delete_post` | `boss_id` (integer, required) | Ephemeral | Deletes a single loot post by boss ID |
| `delete_posts` | `boss_ids` (string, required) | Ephemeral | Deletes multiple loot posts (comma-separated IDs) |
| `create_posts` | None | Ephemeral | Auto-discovers active raids from Raider.io and creates loot posts for all bosses |
| `update_priority_post` | `create_post` (boolean, optional) | Ephemeral | If `create_post=true`: creates new EPGP post. Otherwise updates existing. |

---

### `/epgp` — `commands/epgp.js`

EPGP priority ranking queries.

| Subcommand | Options | Response | Description |
|------------|---------|----------|-------------|
| `get_by_token` | `tier_token` (string, required, choices below) | Ephemeral | Returns formatted EPGP table filtered by tier token |
| `get_by_armour` | `armour_type` (string, required, choices below) | Ephemeral | Returns formatted EPGP table filtered by armour type |

**`tier_token` choices:**
- `Zenith` — Evoker, Monk, Rogue, Warrior
- `Dreadful` — Death Knight, Demon Hunter, Warlock
- `Mystic` — Druid, Hunter, Mage
- `Venerated` — Paladin, Priest, Shaman

**`armour_type` choices:**
- `Cloth`, `Leather`, `Mail`, `Plate`

---

### `/guildinfo` — `commands/guildinfo.js`

Refreshes all guild info channel embeds. **Admin-only** (`setDefaultPermission(false)` + role permission).

| Subcommand | Options | Response | Description |
|------------|---------|----------|-------------|
| *(none — top-level command)* | None | Public (auto-deletes if not in guild info channel) | Clears channel, then posts About Us, Schedule, Recruitment, Achievements sequentially |

**Permission:** Restricted to `adminRoleId` from config.json (type: 1 = role).

---

### `/updateachievements` — `commands/updateAchievements.js`

Updates the achievements embed only. **Admin-only** (`setDefaultPermission(false)` + role permission).

| Subcommand | Options | Response | Description |
|------------|---------|----------|-------------|
| *(none — top-level command)* | None | Public (auto-deletes after 1s) | Updates the achievements embed in the guild info channel |

**Permission:** Restricted to `adminRoleId` from config.json (type: 1 = role).

---

### `/settings` — `commands/settings.js`

Bot feature toggles.

| Subcommand | Options | Response | Description |
|------------|---------|----------|-------------|
| `get_setting` | `setting_name` (string, required, choices below) | Ephemeral | Shows current value of the specified setting |
| `toggle_setting` | `setting_name` (string, required, choices below) | Ephemeral | Flips boolean value (`!currentSetting`) |
| `get_all_settings` | None | Ephemeral | Lists all settings with values |

**`setting_name` choices:**
- `alertSignup_Wednesday`
- `alertSignup_Wednesday_48`
- `alertSignup_Sunday`
- `alertSignup_Sunday_48`

---

## Button Interactions

Handled in `events/interactionCreate.js` via `interaction.isButton()`.

### Applications

| Custom ID | Permission | Action |
|-----------|-----------|--------|
| `acceptedApplicant` | Admin roles only | Opens `createTrialInfoModal`. On submit, creates trial thread and archives application as "Accepted". |
| `rejectedApplicant` | Admin roles only | Archives application thread as "Rejected". |
| `voteFor` | Any user | Casts "For" vote, updates voting embed. |
| `voteNeutral` | Any user | Casts "Neutral" vote, updates voting embed. |
| `voteAgainst` | Any user | Casts "Against" vote, updates voting embed. |
| `voteKekWAgainst` | Any user | Casts "KekW Against" vote (adds to both `againstVotes` and `kekNo`), updates voting embed. |

### Trial Review

| Custom ID | Permission | Action |
|-----------|-----------|--------|
| `updateTrialInfo` | Any user | Opens `updateTrialInfoModal` (pre-fills current data). |
| `extendTrialByOneWeek` | Any user | Extends trial by 1 week, updates message content. |
| `markForPromotion` | Any user | Marks for promotion on next raid day (Sun/Wed 17:30). Updates message to "To Be Promoted". Replies "Already marked" if duplicate. |
| `closeTrial` | Any user | Removes trial from DB, sends "Closing Trial Thread", archives thread, removes buttons. |

### Loot

| Custom ID Pattern | Permission | Action |
|-------------------|-----------|--------|
| `updateLootResponse\|{type}\|{bossId}` | Any user (must be a linked raider) | Records loot priority response. If user has no linked character, replies with ephemeral error. Types: `major`, `minor`, `wantIn`, `wantOut`. |

### Raids

| Custom ID | Permission | Action |
|-----------|-----------|--------|
| `ignore_missing_character` | Any user | Ignores the character (removes from raiders, adds to ignored list), deletes the alert message. |

---

## Modal Submissions

Handled in `events/interactionCreate.js` via `interaction.isModalSubmit()`.

| Custom ID | Fields | Validation | Action |
|-----------|--------|-----------|--------|
| `addNewTrialInfoModal` | `characterNameInput` (3-100 chars), `roleInput` (1-300 chars), `startDateInput` (exactly 10 chars, YYYY-MM-DD) | `dateInputValidator` regex check | Creates trial review thread. If submitted from an application thread, archives it as "Accepted". Reply auto-deletes after 1s. |
| `updateTrialInfoModal` | `characterNameInput` (3-100 chars), `roleInput` (1-300 chars), `startDateInput` (exactly 10 chars, YYYY-MM-DD) | None (direct save) | Updates trial info via `changeTrialInfo` (partial merge). Reply auto-deletes after 1s. |

---

## Select Menu Interactions

Handled in `events/interactionCreate.js` via `interaction.isUserSelectMenu()`.

| Custom ID | Type | Permission | Action |
|-----------|------|-----------|--------|
| `missing_user_select` | UserSelectMenu (single selection) | Any user | Links selected Discord user to the character name shown in the message content. Deletes the alert message on success. Reply auto-deletes after 2s on failure. |

---

## Permission Model

Two levels of permission control:

### Command-level permissions
- `/guildinfo` and `/updateachievements` use `setDefaultPermission(false)` with a permissions array restricting to `adminRoleId` from config.json.
- All other commands have no built-in permission restrictions.

### Interaction-level permissions
- `acceptedApplicant` and `rejectedApplicant` buttons check `checkPermissions(interaction.member)` against hardcoded admin role IDs: `['255630010088423425', '170611904752910336']`.
- All other buttons, modals, and select menus have no permission checks.

---

## Command Registration

`deploy-commands.js` runs on every bot startup (called from `index.js`):
1. Reads all `.js` files from `commands/`
2. Converts each to JSON via `command.data.toJSON()`
3. Registers as guild commands via `Routes.applicationGuildCommands(clientId, guildId)`
4. Uses Discord REST API v9

Commands are **guild-scoped** (only available in the configured guild), not global.
