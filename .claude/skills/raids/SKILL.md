# Raids

Guild roster management, raider-to-Discord user linking, raid signup alerts, and weekly M+/vault reports.

## Files

- `functions/raids/addRaiders.js` — Bulk seeds raiders from JSON on startup
- `functions/raids/addRaider.js` — Adds single raider to DB
- `functions/raids/removeRaider.js` — Removes raider + realm + updates JSON
- `functions/raids/updateRaider.js` — Renames a character (atomic Promise.all)
- `functions/raids/updateRaiderDiscordUser.js` — Links character to Discord user ID
- `functions/raids/updateRaiderJsonData.js` — Exports raiders DB to `./data/{raiderJson}` file
- `functions/raids/addRaiderRealm.js` — Stores WoW realm for a character
- `functions/raids/removeRaiderRealm.js` — Removes realm entry
- `functions/raids/getRaiders.js` — Formatted string of all raiders
- `functions/raids/getStoredRaiders.js` — Array of `{ name, userId }` objects
- `functions/raids/getStoredRaiderRealms.js` — Array of `{ name, realm }` objects
- `functions/raids/addOverlord.js` — Adds guild officer
- `functions/raids/removeOverlord.js` — Removes guild officer
- `functions/raids/getOverlords.js` — Formatted string of overlords
- `functions/raids/ignoreCharacter.js` — Blacklist characters from sync
- `functions/raids/syncRaiders.js` — Reconciles stored roster with Raider.io guild roster
- `functions/raids/sendAlertForRaidersWithNoUser.js` — Posts interactive UI for linking Discord users
- `functions/raids/alertSignups.js` — Alerts unsigned raiders before raids
- `functions/raids/alertHighestMythicPlusDone.js` — Weekly M+ and vault reports
- `functions/raids/getCurrentSignupsForNextRaid.js` — Fetches signup data from WoW Audit
- `commands/raiders.js` — Slash command definitions (12 subcommands)
- `commands/raids.js` — Slash command definitions (1 subcommand)

## Roster Sync

`syncRaiders(client)` runs every 10 min via `setInterval`:

1. Gets stored raiders and realms from Keyv
2. Gets stored ignored characters
3. Fetches guild roster from `raiderioService.getGuildRoster()` (filters ranks 0,1,3,4,5,7)
4. Excludes ignored characters from roster
5. **Case-insensitive comparison** (`.toLowerCase()`) to find additions/removals
6. Removals: calls `removeRaider(name)` for each (also removes realm + updates JSON)
7. Additions: calls `addRaider(name, null)` (no Discord user initially), then `sendAlertForRaidersWithNoUser` for linking
8. Updates realms for all current roster members via `addRaiderRealm`
9. Posts summary message to `botSetupChannelId`

## Startup Seeding

`addRaiders(override, useSeedData)` called in `ready.js` as `addRaiders(false, false)`:

- Checks for `'SeriouslyCasualRaidersSeeded'` marker in `raiders` namespace
- If marker absent (or `override=true`): clears DB, loads from `./data/{raiderJson}` file
- Falls back to `../../data/raidersSeedData.json` if primary file not found
- Sets seeded marker to `true` after completion
- Calls `updateRaiderJsonData()` to sync

`addRaider(name, userId)` prevents adding the seeded marker with exact string check: `if (name === 'SeriouslyCasualRaidersSeeded') return false`.

## Missing User Linking

`sendAlertForRaidersWithNoUser(client, missingUsers?)`:
- If no `missingUsers` provided, finds all raiders with `userId === null`
- For each missing user, posts to `botSetupChannelId`:
  - `UserSelectMenuBuilder` (customId: `missing_user_select`, single selection)
  - `ButtonBuilder` (customId: `ignore_missing_character`, Danger style, label: "Ignore character")
  - Message is **pinned** after sending

## Signup Alerts

`alertSignups(client)` runs via cron `0 19 * * 1,2,5,6` (7pm Mon/Tue/Fri/Sat):

Day-of-week mappings:
- **Monday (1):** Wednesday raid, 2-day reminder — checks `alertSignup_Wednesday_48` setting
- **Tuesday (2):** Wednesday raid, 1-day reminder — checks `alertSignup_Wednesday` setting
- **Friday (5):** Sunday raid, 2-day reminder — checks `alertSignup_Sunday_48` setting
- **Saturday (6):** Sunday raid, 1-day reminder — checks `alertSignup_Sunday` setting

Process:
1. Checks the relevant setting toggle; exits if disabled
2. Gets next Mythic/Planned raid from `wowauditService.getUpcomingRaids()` + `getRaidDetails()`
3. Filters signups with status `'Unknown'` (not signed up)
4. Maps character names to Discord user IDs via `raiders` namespace
5. Sends mentions + random message from `data/signupAlertMessages.json` to `raidersLoungeChannelId`
6. If everyone is signed up: sends `'🎆🎆Everyone has signed for the next raid🎆🎆'`

## Weekly Reports

`alertHighestMythicPlusDone(client)` runs via cron `0 12 * * 3` (noon Wednesday, weekly reset):

- `getPreviousWeekMythicPlusMessage(data)` — formats M+ dungeon completions from WoW Audit historical data as `.txt` file attachment
- `getPreviousWeeklyGreatVaultMessage(data)` — formats vault options (Raid/Dungeon/World columns) as `.txt` file attachment
- Both sent to `weeklyCheckChannelId`

## Ignore System

`ignoreCharacter.js` exports 4 functions:
- `ignoreCharacter(name)` — calls `removeRaider(name)` then adds to `ignoredCharacters` namespace
- `removeIgnoredCharacter(name)` — deletes from `ignoredCharacters`
- `getIgnoredCharacters()` — returns formatted string
- `getStoredIgnoredCharacters()` — returns array of names

`syncRaiders` excludes ignored characters from the Raider.io roster before comparison.

## Keyv Namespaces

| Namespace | Key | Value |
|-----------|-----|-------|
| `raiders` | Character name | Discord user ID (string) or `null` |
| `raidersRealms` | Character name | WoW realm name (string) |
| `overlords` | Overlord name | Discord user ID (string) |
| `ignoredCharacters` | Character name | (exists as set marker) |

Special key: `'SeriouslyCasualRaidersSeeded'` in `raiders` namespace — boolean marker for initialization.

## Slash Commands

### `/raiders get_raiders`
- No options. Returns ephemeral list of all raiders with realm and user ID.

### `/raiders get_ignored_characters`
- No options. Returns ephemeral list.

### `/raiders ignore_character`
- **Option:** `character_name` (string, required)
- Removes from raiders, adds to ignored list.

### `/raiders remove_ignore_character`
- **Option:** `character_name` (string, required)

### `/raiders sync_raiders`
- No options. Triggers manual sync with Raider.io, returns updated raider list.

### `/raiders check_missing_users`
- No options. Posts UserSelectMenu alerts for raiders with no linked Discord user.

### `/raiders update_raider_user`
- **Option:** `character_name` (string, required)
- **Option:** `user` (User, required)

### `/raiders previous_highest_mythicplus`
- No options. Fetches WoW Audit historical data, returns M+ .txt file.

### `/raiders previous_great_vault`
- No options. Fetches WoW Audit historical data, returns vault .txt file.

### `/raiders add_overlord`
- **Option:** `name` (string, required)
- **Option:** `user` (User, required)

### `/raiders get_overlords`
- No options. Returns ephemeral list.

### `/raiders remove_overlord`
- **Option:** `name` (string, required)

### `/raids alert_signups`
- No options. Manually triggers signup alert.

## Button/Select Custom IDs

| Custom ID | Type | Handler Location | Action |
|-----------|------|-----------------|--------|
| `missing_user_select` | UserSelectMenu | `interactionCreate.js` | Calls `updateRaiderDiscordUser` |
| `ignore_missing_character` | Button | `interactionCreate.js` | Calls `ignoreCharacter`, deletes message |

## Scheduled Tasks (from `events/ready.js`)

| Task | Schedule | Function |
|------|----------|----------|
| Seed raiders | Startup (once) | `addRaiders(false, false)` |
| Sync raiders | 10 min (setInterval) | `syncRaiders(client)` |
| Signup alerts | Cron `0 19 * * 1,2,5,6` | `alertSignups(client)` |
| M+ and vault reports | Cron `0 12 * * 3` | `alertHighestMythicPlusDone(client)` |

## Config Dependencies

- `databaseString` — Keyv connection string
- `raiderJson` — Filename for raiders JSON data (e.g. `"raiders.json"`)
- `botSetupChannelId` — Channel for sync summaries and missing user alerts
- `raidersLoungeChannelId` — Channel for signup alerts
- `weeklyCheckChannelId` — Channel for weekly M+/vault reports

## Hardcoded Values

- Raider.io guild: `eu/silvermoon/seriouslycasual` (in `raiderioService.js`)
- Raider.io guild ID: `1061585%2C43113` (in `raiderioService.js`)
- Guild roster rank filter: `[0, 1, 3, 4, 5, 7]` (in `raiderioService.js`)
- Fallback seed file: `../../data/raidersSeedData.json` (in `addRaiders.js`)
- Signup alert time: 19:00 (7 PM) for next raid day comparison (in `alertSignups.js`)
- Random messages file: `data/signupAlertMessages.json` (in `alertSignups.js`)

## External APIs

- **Raider.io** — Guild roster (`getGuildRoster`), M+ runs (`getPreviousWeeklyHighestMythicPlusRun`)
- **WoW Audit** — Raid signups (`getUpcomingRaids`, `getRaidDetails`), historical data (`getHistoricalData`)
