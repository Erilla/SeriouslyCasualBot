# Raider.io Service

Wrapper for the Raider.io public REST API. Provides guild roster data, raid progression rankings, raid/encounter metadata, and Mythic+ character data. No authentication required.

**File:** `services/raiderioService.js`
**HTTP Client:** `axios`
**Base URL:** `https://raider.io/api/v1/`

## Functions

### `getRaidRankings(raid)`

Returns the guild's mythic raid ranking for a specific raid tier.

- **Endpoint:** `GET /raiding/raid-rankings`
- **Query params:**
  - `raid` — Raid slug (e.g. `"nerub-ar-palace"`)
  - `difficulty=mythic`
  - `region=world`
  - `guilds={guildId}` (hardcoded: `1061585%2C43113`)
  - `limit=50`
- **Returns:** Rankings data object containing guild position and progression
- **Error handling:** Returns the axios error object on failure (`.catch((error) => error)`)

**Consumers:**
- `functions/guild-info/updateAchievements.js` — Fetches world ranking and Cutting Edge status per raid tier

---

### `getRaidStaticData(expansionId)`

Returns all raids and their encounters for a given WoW expansion.

- **Endpoint:** `GET /raiding/static-data`
- **Query params:**
  - `expansion_id` — Numeric expansion ID (e.g. `9` for The War Within)
- **Returns:** Object containing `raids` array, each with:
  - `slug`, `name`
  - `ends.eu` — End date for determining if raid is still active
  - `encounters` array with boss `id`, `name`, etc.
- **Returns status 400** when the expansion ID doesn't exist (used as loop terminator)
- **Error handling:** Returns the axios error object on failure

**Consumers:**
- `functions/loot/checkRaidExpansions.js` — Discovers active raids and their bosses for loot post creation
- `functions/guild-info/updateAchievements.js` — Gets raid info for expansions 6+ to build achievement display
- `functions/raids/alertHighestMythicPlusDone.js` — Imported but M+ data primarily comes from WoW Audit

---

### `getPreviousWeeklyHighestMythicPlusRun(region, realm, name)`

Returns a character's highest Mythic+ dungeon run from the previous week.

- **Endpoint:** `GET /characters/profile`
- **Query params:**
  - `region` — e.g. `"eu"`
  - `realm` — e.g. `"silvermoon"`
  - `name` — Character name (URL-encoded via `encodeURIComponent`)
  - `fields=mythic_plus_previous_weekly_highest_level_runs`
- **Returns:** Character profile data with `mythic_plus_previous_weekly_highest_level_runs` array, each containing `mythic_level`
- **Error handling:** Returns the axios error object on failure

**Consumers:**
- `functions/raids/alertHighestMythicPlusDone.js` — Used in `getHighestMythicPlusDoneMessage()` for per-character M+ lookups

---

### `getGuildRoster()`

Returns the current guild member roster, filtered by rank.

- **Endpoint:** `GET /guilds/profile`
- **Query params (all hardcoded):**
  - `region=eu`
  - `realm=silvermoon`
  - `name=seriouslycasual`
  - `fields=members`
- **Post-processing:** Filters members to ranks `[0, 1, 3, 4, 5, 7]` only (excludes ranks 2, 6, and 8+)
- **Returns:** Filtered array of member objects, each containing `character` (with `name`) and `rank`
- **Error handling:** Returns the axios error object on failure
- **Note:** This function uses `await` on the promise chain (unlike the other functions), so errors may throw rather than return

**Consumers:**
- `functions/raids/syncRaiders.js` — Compares guild roster against stored raiders every 10 minutes

## Hardcoded Values

| Value | Location | Purpose |
|-------|----------|---------|
| `'1061585%2C43113'` | Line 3 (`guildId` const) | Raider.io internal guild identifier for rankings |
| `'eu'` | Line 44 | Region |
| `'silvermoon'` | Line 45 | Realm |
| `'seriouslycasual'` | Line 46 | Guild name |
| `[0, 1, 3, 4, 5, 7]` | Line 57 | Guild rank filter for roster |

## Config Dependencies

None. This service has no config.json imports — all values are hardcoded.

## Error Handling Pattern

All functions (except `getGuildRoster`) follow the same pattern:
```javascript
const promise = axios.get(url);
const dataPromise = promise
    .then((response) => response.data)
    .catch((error) => error);
return dataPromise;
```
This means on error, the **error object itself** is returned as the resolved value rather than throwing. Callers must check the return type to distinguish success from failure.

`getGuildRoster` uses `await` before the chain and accesses `.members` on the result, so it will throw if the request fails (no `.members` on an error object).

## Endpoint Verification (Feb 2026)

All endpoints verified as live and returning expected data:

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /raiding/raid-rankings` | Verified | Returns `raidRankings` array with `rank`, `regionRank`, `guild`, `encountersDefeated`, `encountersPulled` |
| `GET /raiding/static-data` | Verified | Returns `raids` array with encounters, start/end dates. Returns 400 for invalid expansion IDs (used as loop terminator) |
| `GET /characters/profile` | Verified | Returns character data with `mythic_plus_previous_weekly_highest_level_runs` array. Returns 400 for non-existent characters |
| `GET /guilds/profile` | Verified | Returns guild "SeriouslyCasual" on Silvermoon with 500+ members. `fields=members` returns full roster |

No authentication required for any endpoint. All endpoints are public and rate-limited by Raider.io's standard limits.

**API Documentation:** [Raider.io API Docs](https://raider.io/api)

## Consumer Map

| Function | Used By Domain | Used By File |
|----------|---------------|-------------|
| `getRaidRankings` | Guild Info | `functions/guild-info/updateAchievements.js` |
| `getRaidStaticData` | Loot, Guild Info | `functions/loot/checkRaidExpansions.js`, `functions/guild-info/updateAchievements.js` |
| `getPreviousWeeklyHighestMythicPlusRun` | Raids | `functions/raids/alertHighestMythicPlusDone.js` |
| `getGuildRoster` | Raids | `functions/raids/syncRaiders.js` |
