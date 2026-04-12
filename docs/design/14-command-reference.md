# 14 -- Command Reference

Complete catalog of all slash commands registered by the bot. This document covers command registration, all 9 command groups, their subcommands, options, response types, and known issues.

---

## Command Registration

Commands are registered on every bot startup via `deploy-commands.js`.

**Mechanism:**
- Uses `@discordjs/rest` with `REST({ version: '9' })` and Discord API `Routes.applicationGuildCommands(clientId, guildId)`
- Commands are **guild-scoped** (registered to a specific server), not global
- The `clientId` and `guildId` come from `config.json`
- All `.js` files in `commands/` are loaded, their `data.toJSON()` is collected, and a single `PUT` request registers them all
- Command permissions are collected but not applied via the API (they are defined in the export but the `rest.put` call only sends command data)

**Registration code path:**
```
index.js -> deployCommands() -> rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
```

**Command files loaded (9 files):**
`applicants.js`, `epgp.js`, `guildinfo.js`, `loot.js`, `raiders.js`, `raids.js`, `settings.js`, `trials.js`, `updateAchievements.js`

---

## Command Catalog

### /applicants

**Description:** `'Commands surrounding applicants'`

**Source:** `commands/applicants.js`

| Subcommand | Description | Options | Response |
|------------|-------------|---------|----------|
| `create_voting_message` | Creates a voting message for an applicant | `thread_id` (String, required) | Ephemeral reply: success or error message |

**Details:**
- Calls `createVotingThreadMessage(interaction.client, threadId)`
- On success: `"Successfully added voting message to thread Id ${threadId}"`
- On failure: `"Error: Did not add voting message to thread Id ${threadId}"`

---

### /trials

**Description:** `'Commands surrounding trials'`

**Source:** `commands/trials.js`

| Subcommand | Description | Options | Response |
|------------|-------------|---------|----------|
| `create_thread` | Creates a trial review thread | None | Opens `createTrialInfoModal` modal |
| `get_current_trials` | Returns a list of current trials and their start dates | None | Ephemeral reply: JSON of all trials |
| `remove_trial` | Removes specified trial with thread id | `thread_id` (String, required) | Ephemeral reply: success or error |
| `change_trial_info` | Changes a specified trials info with thread id | `thread_id` (String, required), `character_name` (String, optional), `role` (String, optional), `start_date` (String, optional) | Ephemeral reply: success message |
| `update_trial_logs` | Updates all messages with trial logs | None | Ephemeral reply: `"Trial Logs updated"` |
| `update_trial_review_messages` | Updates all trial review messages | None | Ephemeral reply: `"Updating Trial Review Messages..."` then edited to `"Trial Review Messages updated"` |

**Subcommand Details:**

- **`create_thread`**: Does not reply directly. Instead calls `createTrialInfoModal(interaction)` which presents a modal dialog. The modal submission is handled in `interactionCreate.js`.

- **`remove_trial`**: Calls `removeTrial(threadId)`. Note: the return value is checked synchronously (no `await`), which may cause issues if `removeTrial` is asynchronous.

- **`change_trial_info`**: Accepts partial updates. Only provided fields are changed. Calls `changeTrialInfo(interaction.client, threadId, { characterName, role, startDate })`.

- **`update_trial_review_messages`**: Shows a loading message first (`"Updating Trial Review Messages..."`), runs the update, then edits the reply to indicate completion.

---

### /raiders

**Description:** `'Commands surrounding raiders'`

**Source:** `commands/raiders.js`

This is the largest command group with 12 subcommands.

| Subcommand | Description | Options | Response |
|------------|-------------|---------|----------|
| `get_raiders` | Returns list of current raiders | None | Ephemeral reply: formatted raider list |
| `get_ignored_characters` | Returns list of ignored characters | None | Ephemeral reply: formatted list |
| `ignore_character` | Ignores character for sync raiders | `character_name` (String, required) | Ephemeral reply: success or error |
| `remove_ignore_character` | Remove specified ignored character | `character_name` (String, required) | Ephemeral reply: success or error |
| `sync_raiders` | Syncs raiders with BattleNet roster | None | Ephemeral reply: raider list after sync |
| `check_missing_users` | Checks for raiders with missing users | None | Ephemeral reply: `"Success!"` (alerts posted to botSetupChannelId) |
| `update_raider_user` | Updates specified raiders user id | `character_name` (String, required), `user` (User, required) | Ephemeral reply: success or error |
| `previous_highest_mythicplus` | Returns the highest mythic plus dungeon each raider has completed | None | Public reply: `"Retrieving runs..."` then edited with M+ data |
| `previous_great_vault` | Returns the previous great vault each raider has completed | None | Public reply: `"Retrieving runs..."` then edited with vault data |
| `add_overlord` | Adds specified user as overlord | `name` (String, required), `user` (User, required) | Ephemeral reply: success or error |
| `get_overlords` | Returns list of current overlords | None | Ephemeral reply: formatted overlord list |
| `remove_overlord` | Removes specified overlord | `name` (String, required) | **NEVER TRIGGERS** (see bug below) |

**Known Bug: `remove_overlord` / `remove_overlords` mismatch**

The subcommand is registered in the `SlashCommandBuilder` as `remove_overlord` (singular):
```javascript
subcommand.setName('remove_overlord')
```

But the handler in the `execute` function checks for `remove_overlords` (plural):
```javascript
else if (interaction.options.getSubcommand() === 'remove_overlords') {
```

Because the registered name (`remove_overlord`) never matches the handler check (`remove_overlords`), this subcommand silently does nothing when invoked. The underlying `removeOverlord(name)` function works correctly -- it is the string comparison that fails.

**Option Details:**

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `character_name` | String | Character name of the raider | Yes (on ignore_character, remove_ignore_character, update_raider_user) |
| `user` | User | Discord user of the raider | Yes (on update_raider_user, add_overlord) |
| `name` | String | Name of the user/overlord | Yes (on add_overlord, remove_overlord) |

**Note on `previous_highest_mythicplus` and `previous_great_vault`:** These are the only subcommands that reply with a non-ephemeral (public) message. They show a loading message (`"Retrieving runs..."`) and then edit it with the result. Both call `getHistoricalData()` from `wowauditService` first, then pass the data to the respective formatting function.

---

### /raids

**Description:** `'Commands surrounding raids'`

**Source:** `commands/raids.js`

| Subcommand | Description | Options | Response |
|------------|-------------|---------|----------|
| `alert_signups` | Alert raiders that have not signed to sign up for the next raid | None | Ephemeral reply: `"Not signed Raiders alerted"` or error content |

**Details:**
- Calls `alertSignups(interaction.client)` which checks the current day of the week and relevant settings before sending alerts
- On success: ephemeral reply
- On error: the error itself is sent as ephemeral reply content (`content: error`)

---

### /loot

**Description:** `'Commands around the loot'`

**Source:** `commands/loot.js`

| Subcommand | Description | Options | Response |
|------------|-------------|---------|----------|
| `add_post` | Adds a test loot post | None | Ephemeral reply: `"Post added"` |
| `delete_post` | Deletes specified loot post | `boss_id` (Integer, required) | Ephemeral reply: `"Loot post removed"` |
| `delete_posts` | Deletes specified loot posts (batch) | `boss_ids` (String, required) | Ephemeral reply: `"Deleting posts"` then edited to `"Deleted posts"` |
| `create_posts` | Adds the current raids loot post | None | Ephemeral reply: `"Checking raid expansions"` then edited to `"Checked raid expansions"` |
| `update_priority_post` | Updates the priority post | `create_post` (Boolean, optional) | Ephemeral reply: `"Creating/Updating Priority post..."` |

**Option Details:**

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `boss_id` | Integer | Specified Boss Id | Yes (delete_post) |
| `boss_ids` | String | Specified Boss Ids (split by commas) | Yes (delete_posts) |
| `create_post` | Boolean | Creates the post | No (update_priority_post) |

**Subcommand Details:**

- **`add_post`**: Creates a hardcoded test boss post with `{ id: 1, name: 'Test Boss', url: 'http://www.google.com' }`. Used for development/testing only.

- **`delete_posts`**: The `boss_ids` string is split by commas into an array. Each ID is passed to `deleteLootPost` and all deletions run concurrently via `Promise.all`.

- **`create_posts`**: Calls `checkRaidExpansions(interaction.client)` which auto-discovers the current raid tier from the Raider.io API and creates loot posts for each boss encounter.

- **`update_priority_post`**: If `create_post` is truthy, calls `createPriorityRankingPost(interaction)`. Otherwise calls `updatePriorityRankingPost(interaction.client, interaction)`.

**Known Bug: `update_priority_post` if/else if issue**

The handler for `create_posts` and `update_priority_post` uses `if` instead of `else if`:

```javascript
else if (interaction.options.getSubcommand() === 'create_posts') {
    // ... checkRaidExpansions ...
}
if (interaction.options.getSubcommand() === 'update_priority_post') {
    // ... update/create priority post ...
}
```

The second condition uses `if` (not `else if`), meaning it is evaluated independently of the `create_posts` branch above it. In practice this only causes a problem if both subcommands somehow matched the same string (they do not), but the missing `else` breaks the if/else-if chain. If the subcommand is `create_posts`, the code enters that branch, then falls through to also check the `update_priority_post` condition (which will be false). This is functionally harmless but structurally inconsistent with the rest of the handler.

---

### /epgp

**Description:** `'Commands around the EPGP'`

**Source:** `commands/epgp.js`

| Subcommand | Description | Options | Response |
|------------|-------------|---------|----------|
| `get_by_token` | Returns a table containing EPGP filtered by specified token type | `tier_token` (String choice, required) | Ephemeral reply: loading message then edited with rankings table |
| `get_by_armour` | Returns a table containing EPGP filtered by specified armour type | `armour_type` (String choice, required) | Ephemeral reply: loading message then edited with rankings table |

**Tier Token Choices:**

| Display Name | Value |
|-------------|-------|
| `Zenith (Evoker, Monk, Rogue, Warrior)` | `Zenith` |
| `Dreadful (Death Knight, Demon Hunter, Warlock)` | `Dreadful` |
| `Mystic (Druid, Hunter, Mage)` | `Mystic` |
| `Venerated (Paladin, Priest, Shaman)` | `Venerated` |

**Armour Type Choices:**

| Display Name | Value |
|-------------|-------|
| `Cloth` | `Cloth` |
| `Leather` | `Leather` |
| `Mail` | `Mail` |
| `Plate` | `Plate` |

**Details:**
- `get_by_token`: Calls `generatePriorityRankingsPost(tierToken)` (first param = tier token, second param defaults to undefined)
- `get_by_armour`: Calls `generatePriorityRankingsPost(null, armourType)` (first param = null, second param = armour type)
- Both show a loading message (`"Retrieving rankings by ${value}..."`) then edit the reply with the formatted CSS code block

---

### /guildinfo

**Description:** `'Update for Guild information sections'`

**Source:** `commands/guildinfo.js`

**Admin-only:** `setDefaultPermission(false)` with permission for `adminRoleId`

| Subcommand | Description | Options | Response |
|------------|-------------|---------|----------|
| *(top-level, no subcommands)* | Refreshes all guild info sections | None | Reply: `"Updating Guild Info..."` (auto-deleted if not in guild info channel) |

**This is a top-level command with no subcommands.**

**Execution Sequence:**
1. Replies with `"Updating Guild Info..."`
2. `clearGuildInfo(interaction)` -- deletes all messages in the guild info channel and clears the `guildinfo` Keyv namespace
3. `updateAboutUs(interaction)` -- posts About Us embed with link buttons
4. `updateSchedule(interaction)` -- posts Schedule embed
5. `updateRecruitment(interaction)` -- posts Recruitment embed with Apply Here button
6. `updateAchievements(interaction)` -- posts Achievements embed (manual + API data)
7. If not invoked in `guildInfoChannelId`: waits 1 second, then deletes the reply

**Permission Configuration:**
```javascript
permissions: [{
    id: adminRoleId,    // from config.json
    type: 1,            // ROLE type
    permission: true,
}]
```

---

### /updateachievements

**Description:** `'Updates achievements'`

**Source:** `commands/updateAchievements.js`

**Admin-only:** `setDefaultPermission(false)` with permission for `adminRoleId`

| Subcommand | Description | Options | Response |
|------------|-------------|---------|----------|
| *(top-level, no subcommands)* | Updates the achievements section | None | Reply: `"Updates achievements..."` (auto-deleted after 1 second) |

**This is a top-level command with no subcommands.**

**Execution Sequence:**
1. Replies with `"Updates achievements..."`
2. Calls `updateAchievements(interaction)` -- note: **not awaited**, runs in background
3. Waits 1 second
4. Deletes the reply

**Permission Configuration:**
```javascript
permissions: [{
    id: adminRoleId,    // from config.json
    type: 1,            // ROLE type
    permission: true,
}]
```

**Note:** Unlike `/guildinfo`, this command always deletes its reply after 1 second, regardless of which channel it was invoked in.

---

### /settings

**Description:** `'Commands for settings'`

**Source:** `commands/settings.js`

| Subcommand | Description | Options | Response |
|------------|-------------|---------|----------|
| `get_setting` | Returns the current settings | `setting_name` (String choice, required) | Ephemeral reply: `"${setting} is currently set as ${value}"` |
| `toggle_setting` | Toggles given settings | `setting_name` (String choice, required) | Ephemeral reply: `"Set ${setting} as ${newValue}"` |
| `get_all_settings` | Returns the all settings | None | Ephemeral reply: `"__**All Settings**__\n${allSettings}"` |

**Setting Name Choices (shared by `get_setting` and `toggle_setting`):**

| Display Name | Value |
|-------------|-------|
| `alertSignup_Wednesday` | `alertSignup_Wednesday` |
| `alertSignup_Wednesday_48` | `alertSignup_Wednesday_48` |
| `alertSignup_Sunday` | `alertSignup_Sunday` |
| `alertSignup_Sunday_48` | `alertSignup_Sunday_48` |

The display names and values are identical -- they come from the `settings` object exported by `functions/settings/settings.js`.

**Details:**
- `get_setting`: Reads the current boolean value via `getSettings(setting)` (defaults to `false` if unset)
- `toggle_setting`: Reads current value, inverts it with `!currentSetting`, writes via `setSetting(setting, newSetting)`
- `get_all_settings`: Iterates all entries in the settings Keyv namespace, formats as `"key: value\n"` per entry

---

## Summary Table

| Command | Subcommands | Admin-Only | Has Options | Response Style |
|---------|-------------|------------|-------------|----------------|
| `/applicants` | 1 | No | Yes | Ephemeral |
| `/trials` | 6 | No | Yes (varies) | Ephemeral / Modal |
| `/raiders` | 12 | No | Yes (varies) | Ephemeral / Public |
| `/raids` | 1 | No | No | Ephemeral |
| `/loot` | 5 | No | Yes (varies) | Ephemeral |
| `/epgp` | 2 | No | Yes | Ephemeral |
| `/guildinfo` | 0 (top-level) | Yes | No | Public (auto-delete) |
| `/updateachievements` | 0 (top-level) | Yes | No | Public (auto-delete) |
| `/settings` | 3 | No | Yes (varies) | Ephemeral |

**Total subcommands across all groups:** 30

---

## Interaction Types Beyond Commands

While this document focuses on slash commands, the bot also handles button clicks, modal submissions, and select menus via `events/interactionCreate.js`. These are documented in [02-interaction-routing.md](02-interaction-routing.md). The key cross-references:

- `/trials create_thread` triggers the `createTrialInfoModal` which is handled as a modal submission
- `/loot create_posts` generates buttons (`updateLootResponse|{type}|{bossId}`) handled as button interactions
- `/applicants create_voting_message` generates vote buttons (`voteFor`, `voteNeutral`, `voteAgainst`, `voteKekWAgainst`) handled as button interactions
- `/raiders check_missing_users` generates user select menus (`missing_user_select`) and buttons (`ignore_missing_character`) handled in the interaction router
