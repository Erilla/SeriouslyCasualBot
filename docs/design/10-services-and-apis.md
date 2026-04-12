# 10 - Services and External APIs

This document covers all 5 external service integrations used by the bot. Four live in the `services/` directory; one (WarcraftLogs) lives in `functions/trial-review/`.

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Raider.io Service](#raiderio-service)
3. [WoW Audit Service](#wow-audit-service)
4. [EPGP Service](#epgp-service)
5. [WarcraftLogs Integration](#warcraftlogs-integration)
6. [Battle.net Service (DEPRECATED)](#battlenet-service-deprecated)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Domain Usage Map](#domain-usage-map)

---

## Service Overview

| Service | File | Lines | HTTP Client | Authentication | Status |
|---------|------|-------|-------------|----------------|--------|
| Raider.io | `services/raiderioService.js` | 67 | axios | None | Active |
| WoW Audit | `services/wowauditService.js` | 58 | node-fetch | API secret header | Active |
| EPGP | `services/epgpService.js` | 22 | axios | None | Active |
| WarcraftLogs | `functions/trial-review/getTrialLogs.js` | 79 | node-fetch | OAuth2 + GraphQL | Active |
| Battle.net | `services/battleNetService.js` | 42 | node-fetch | OAuth2 client credentials | **DEPRECATED** |

All services use CommonJS exports. No service shares state with another. Each is imported independently by the domain functions that need it.

---

## Raider.io Service

**File:** `services/raiderioService.js` (67 lines)
**HTTP Client:** axios
**Authentication:** None required
**Base URLs:** `https://raider.io/api/v1/`

### Constants

```js
const guildId = '1061585%2C43113';
```

This is the URL-encoded Raider.io guild identifier for "Seriously Casual" on EU-Silvermoon. The `%2C` is an encoded comma separating the guild's internal Raider.io identifiers.

### Endpoints

#### 1. getRaidRankings(raid)

Fetches the guild's mythic raid ranking for a specific raid tier.

```
GET https://raider.io/api/v1/raiding/raid-rankings
    ?raid={raid}
    &difficulty=mythic
    &region=world
    &guilds=1061585%2C43113
    &limit=50
```

| Parameter | Source | Example |
|-----------|--------|---------|
| `raid` | Function argument | `'nerubar-palace'` (raid slug) |
| `difficulty` | Hardcoded | `'mythic'` |
| `region` | Hardcoded | `'world'` |
| `guilds` | Hardcoded constant | `'1061585%2C43113'` |
| `limit` | Hardcoded | `50` |

**Returns:** `response.data` (the full Raider.io response body)

**Consumers:**
- `functions/guild-info/updateAchievements.js` -- for raid progress and world rankings

---

#### 2. getRaidStaticData(expansionId)

Fetches static raid data (raid names, encounters, dates) for a given expansion.

```
GET https://raider.io/api/v1/raiding/static-data
    ?expansion_id={expansionId}
```

| Parameter | Source | Example |
|-----------|--------|---------|
| `expansion_id` | Function argument | `9`, `10`, etc. |

**Returns:** `response.data` (contains `raids` array with encounter details)

**Consumers:**
- `functions/loot/checkRaidExpansions.js` -- discovers current raid tier and encounters for loot posts
- `functions/guild-info/updateAchievements.js` -- raid tier data for achievements display

---

#### 3. getPreviousWeeklyHighestMythicPlusRun(region, realm, name)

Fetches a character's highest M+ runs from the previous weekly reset.

```
GET https://raider.io/api/v1/characters/profile
    ?region={region}
    &realm={realm}
    &name={encodeURIComponent(name)}
    &fields=mythic_plus_previous_weekly_highest_level_runs
```

| Parameter | Source | Example |
|-----------|--------|---------|
| `region` | Function argument | `'eu'` |
| `realm` | Function argument | `'silvermoon'` |
| `name` | Function argument (URL-encoded) | `'Charactername'` |
| `fields` | Hardcoded | `'mythic_plus_previous_weekly_highest_level_runs'` |

**Returns:** `response.data` (contains `mythic_plus_previous_weekly_highest_level_runs` array)

**Consumers:**
- `functions/raids/alertHighestMythicPlusDone.js` -- weekly M+ report generation

---

#### 4. getGuildRoster()

Fetches the full guild roster and filters to raider ranks.

```
GET https://raider.io/api/v1/guilds/profile
    ?region=eu
    &realm=silvermoon
    &name=seriouslycasual
    &fields=members
```

All parameters are hardcoded:

| Parameter | Value |
|-----------|-------|
| `region` | `'eu'` |
| `realm` | `'silvermoon'` |
| `name` | `'seriouslycasual'` |
| `fields` | `'members'` |

**Post-processing:** The raw `response.data.members` array is filtered by guild rank:

```js
const filteredMembers = dataPromise.members.filter(
    m => [0, 1, 3, 4, 5, 7].includes(m.rank)
);
```

| Rank | Meaning (typical WoW guild) |
|------|-----------------------------|
| 0 | Guild Master |
| 1 | Officer |
| 3 | Raider (rank 2 excluded -- likely alt/social rank) |
| 4 | Raider variant |
| 5 | Raider variant |
| 7 | Raider variant (rank 6 excluded) |

**Returns:** Filtered array of member objects.

**Note:** This function uses `await` on the promise (unlike the other three functions in this file which do not), making it a minor inconsistency in the code style.

**Consumers:**
- `functions/raids/syncRaiders.js` -- periodic roster synchronization

---

### Exports

```js
exports.getRaidRankings = getRaidRankings;
exports.getRaidStaticData = getRaidStaticData;
exports.getPreviousWeeklyHighestMythicPlusRun = getPreviousWeeklyHighestMythicPlusRun;
exports.getGuildRoster = getGuildRoster;
```

All four functions are exported.

---

## WoW Audit Service

**File:** `services/wowauditService.js` (58 lines)
**HTTP Client:** node-fetch (v2)
**Authentication:** API secret in Authorization header
**Base URL:** `https://wowaudit.com/v1/`

### Authentication

All requests use a shared options generator:

```js
const generateQueryOptions = () => {
    return {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `${wowAuditApiSecret}`,
        },
    };
};
```

- The `wowAuditApiSecret` is imported from `config.json`
- The secret is placed directly in the `Authorization` header with NO scheme prefix (no `Bearer`, no `Basic` -- just the raw secret value)
- The `accept` header is lowercase (non-standard but functional)

### Endpoints

#### 1. getUpcomingRaids()

Fetches upcoming (future) raids from the guild's WoW Audit calendar.

```
GET https://wowaudit.com/v1/raids?include_past=false
```

No function parameters. The `include_past=false` query parameter is hardcoded.

**Returns:** `response.raids` (array of raid objects with signup data)

**Consumers:**
- `functions/raids/alertSignups.js` -- signup alert system (via `getCurrentSignupsForNextRaid`)

---

#### 2. getRaidDetails(id)

Fetches detailed information for a specific raid.

```
GET https://wowaudit.com/v1/raids/${id}}
```

**BUG:** The URL template has an extra closing brace `}` after `${id}`:

```js
`https://wowaudit.com/v1/raids/${id}}`
//                                    ^ extra } is a literal character in the URL
```

This means the actual HTTP request is sent to a URL like `https://wowaudit.com/v1/raids/12345}` with a trailing `}`. This is a bug in the source code. Whether the WoW Audit API tolerates this or the function silently fails depends on the API's URL handling.

| Parameter | Source | Example |
|-----------|--------|---------|
| `id` | Function argument | `12345` |

**Returns:** `response` (the full parsed JSON response, not a nested property)

**Consumers:**
- Currently no direct consumer found in the codebase (may be used for future features or debugging)

---

#### 3. getHistoricalData()

Fetches historical character data (M+ runs, vault status) for the previous reset period.

```
GET https://wowaudit.com/v1/historical_data?period={previousPeriod}
```

**Takes NO parameters.** The period is calculated internally:

```js
const getHistoricalData = async () => {
    const previousPeriod = +(await getCurrentPeriod()) - 1;
    return await fetch(
        `https://wowaudit.com/v1/historical_data?period=${previousPeriod}`,
        generateQueryOptions(),
    )
        .then((response) => response.json())
        .then((response) => response.characters)
        .catch((err) => console.error(err));
};
```

1. Calls `getCurrentPeriod()` to get the current WoW Audit period number
2. Converts to number with unary `+` and subtracts 1 to get the previous period
3. Fetches historical data for that period

**Returns:** `response.characters` (array of character objects with vault/M+ data)

**Consumers:**
- `functions/raids/alertHighestMythicPlusDone.js` -- weekly M+ and Great Vault reports
- `commands/raiders.js` -- `/raiders previous_highest_mythicplus` and `/raiders previous_great_vault` subcommands

---

#### 4. getCurrentPeriod() -- INTERNAL ONLY

Fetches the current WoW Audit period number.

```
GET https://wowaudit.com/v1/period
```

**Returns:** `response.current_period` (a number representing the current weekly reset period)

**IMPORTANT:** This function is **NOT exported**. It is only used internally by `getHistoricalData()`. External code cannot call it directly.

---

### Exports

```js
exports.getUpcomingRaids = getUpcomingRaids;
exports.getRaidDetails = getRaidDetails;
exports.getHistoricalData = getHistoricalData;
// NOTE: getCurrentPeriod is NOT exported
```

Only three of the four functions are exported. `getCurrentPeriod` is a private internal helper.

---

## EPGP Service

**File:** `services/epgpService.js` (22 lines)
**HTTP Client:** axios
**Authentication:** None required
**Base URL:** `https://epgp-api.ryanwong.uk/api/Points/raider/all`

### Endpoints

#### 1. getPriorityRankings(tierToken, armourType)

Fetches EPGP priority rankings, optionally filtered by tier token or armour type.

The URL is built conditionally:

```js
const getPriorityRankings = (tierToken, armourType) => {
    let url = 'https://epgp-api.ryanwong.uk/api/Points/raider/all';

    if (tierToken) {
        url += `/tierToken/${tierToken}`;
    }
    else if (armourType) {
        url += `/armour/${armourType}`;
    }

    // ... axios.get(url)
};
```

This yields three possible URL patterns:

| Condition | URL | Example |
|-----------|-----|---------|
| No filter (both falsy) | `https://epgp-api.ryanwong.uk/api/Points/raider/all` | All raiders |
| `tierToken` is truthy | `https://epgp-api.ryanwong.uk/api/Points/raider/all/tierToken/{tierToken}` | `.../tierToken/Zenith` |
| `armourType` is truthy (and `tierToken` is falsy) | `https://epgp-api.ryanwong.uk/api/Points/raider/all/armour/{armourType}` | `.../armour/Cloth` |

**Priority rule:** `tierToken` takes precedence over `armourType`. If both are provided, only `tierToken` is used (due to `if/else if` structure).

**Valid tier tokens:** Zenith, Dreadful, Mystic, Venerated
**Valid armour types:** Cloth, Leather, Mail, Plate

**Returns:** `response.data` (contains `raiders` array with points data, `lastUploadedDate`, `cutOffDate`)

**Response data shape:**

```
{
    raiders: [
        {
            characterName: string,
            points: {
                effortPoints: number,
                effortPointsDifference: number,
                gearPoints: number,
                gearPointsDifference: number,
                priority: number
            }
        },
        ...
    ],
    lastUploadedDate: string (ISO date),
    cutOffDate: string (ISO date)
}
```

**Consumers:**
- `functions/epgp/priorityRankingPost.js` -- EPGP priority ranking display (auto-updated every 10 minutes)

---

### Exports

```js
exports.getPriorityRankings = getPriorityRankings;
```

Single export.

---

## WarcraftLogs Integration

**File:** `functions/trial-review/getTrialLogs.js` (79 lines)
**HTTP Client:** node-fetch (v2)
**Authentication:** OAuth2 client credentials + GraphQL
**NOT in `services/` directory** -- lives in `functions/trial-review/` because it is specific to the trial review domain.

### Database

Creates its own Keyv instance for the `trials` namespace (though it does not appear to use it in the current code -- it may be a leftover from earlier development).

### OAuth2 Token Acquisition

#### getToken() -- INTERNAL

```
POST https://www.warcraftlogs.com/oauth/token
```

**Request:**

```
Content-Type: application/x-www-form-urlencoded

Body (URLSearchParams):
    client_id={warcraftLogsClientId}
    &client_secret={warcraftLogsClientSecret}
    &grant_type=client_credentials
```

- `warcraftLogsClientId` and `warcraftLogsClientSecret` are imported from `config.json`
- Uses `URLSearchParams` to build the form-encoded body, then calls `.toString()`
- The Content-Type header is set explicitly (not auto-set by node-fetch for URLSearchParams)

**Returns:** `response.access_token` (a Bearer token string)

**Note:** A fresh token is obtained on every call to `getTrialLogs()`. There is no token caching or expiry management.

---

### GraphQL Query

#### getTrialLogs(characterName)

```
POST https://www.warcraftlogs.com/api/v2/client
```

**Request headers:**

```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request body (GraphQL):**

```json
{
    "query": "query getGuildAttendance($guildId: Int) {\n    guildData {\n        guild (id: $guildId) {\n            id,\n            name,\n            attendance {\n                data {\n                    code,\n                    players {\n                        name,\n                        presence,\n                        type\n                    }\n                }\n            }\n        }\n    }\n}",
    "variables": {
        "guildId": 486913
    }
}
```

**Guild ID:** `486913` (hardcoded in the variables object, not from config)

**Full GraphQL query text:**

```graphql
query getGuildAttendance($guildId: Int) {
    guildData {
        guild (id: $guildId) {
            id,
            name,
            attendance {
                data {
                    code,
                    players {
                        name,
                        presence,
                        type
                    }
                }
            }
        }
    }
}
```

**Response processing:**

```
response.data.guildData.guild.attendance.data -> array of report objects
```

Each report object has:
- `code` -- the WarcraftLogs report code (used in URLs)
- `players` -- array of `{ name, presence, type }` objects

**Filtering logic:**

```js
const reportCodes = result.data.guildData.guild.attendance.data.map(s => {
    s.players = s.players.filter(
        p => p.name === characterName && p.presence === 1
    );
    return s.players.length ? s.code : null;
}).filter(code => code !== null);
return reportCodes.reverse();
```

1. For each report in the attendance data:
   - Mutates `s.players` to keep only entries where `name` matches `characterName` exactly (case-sensitive) AND `presence === 1` (the player was present)
   - If any matching players remain, returns the report `code`; otherwise returns `null`
2. Filters out `null` values
3. Reverses the array (WarcraftLogs returns chronological; this makes it reverse-chronological)

**Returns:** Array of report code strings in reverse chronological order (most recent first).

**Log URL format:** Each code maps to `https://www.warcraftlogs.com/reports/{code}`

**Consumers:**
- `functions/trial-review/generateTrialLogsContent.js` -- generates log links for trial review threads
- `functions/trial-review/updateTrialLogs.js` -- periodic refresh of log links (every 60 minutes)

---

### Exports

```js
exports.getTrialLogs = getTrialLogs;
```

Only `getTrialLogs` is exported. `getToken` is internal.

---

## Battle.net Service (DEPRECATED)

**File:** `services/battleNetService.js` (42 lines)
**HTTP Client:** node-fetch (v2)
**Authentication:** OAuth2 client credentials
**Status:** **DEPRECATED** -- replaced by Raider.io service for guild roster functionality.

This service was the original guild roster provider. It has been superseded by `raiderioService.getGuildRoster()` which does not require API credentials and provides the same data.

### Constants

```js
const guildId = 'seriouslycasual';
const guildServer = 'silvermoon';
```

### OAuth2 Token Acquisition

#### getAccessToken() -- INTERNAL

```
POST https://oauth.battle.net/token
```

**Request:**

```
Authorization: Basic {Base64(bnetClientId:bnetClientSecret)}
Content-Type: application/x-www-form-urlencoded

Body (URLSearchParams):
    grant_type=client_credentials
```

- `bnetClientId` and `bnetClientSecret` are imported from `config.json`
- Uses HTTP Basic authentication: `Buffer.from(\`${bnetClientId}:${bnetClientSecret}\`).toString('base64')`
- Body is built with `URLSearchParams` and `.append()` (different from WarcraftLogs which uses constructor)

**Returns:** `response['access_token']` (accesses the property via bracket notation, not dot notation)

---

### Endpoints

#### 1. getGuildRoster()

Fetches the guild roster from the official Blizzard API.

```
GET https://eu.api.blizzard.com/data/wow/guild/silvermoon/seriouslycasual/roster
    ?namespace=profile-eu
    &locale=en_US
    &access_token={accessToken}
```

| Parameter | Source | Value |
|-----------|--------|-------|
| Guild server | Hardcoded constant | `silvermoon` |
| Guild ID | Hardcoded constant | `seriouslycasual` |
| `namespace` | Hardcoded | `profile-eu` |
| `locale` | Hardcoded | `en_US` |
| `access_token` | From `getAccessToken()` | OAuth2 token |

**Post-processing:** Filters members by rank AND level:

```js
const filteredMembers = dataPromise.members.filter(
    m => [0, 1, 3, 4, 5, 7].includes(m.rank) && m.character.level >= 10
);
```

**Key difference from Raider.io version:** The Battle.net version includes an additional `m.character.level >= 10` filter. The Raider.io replacement does NOT have this level filter.

**Rank filter:** Same as Raider.io: `[0, 1, 3, 4, 5, 7]`

**Returns:** Filtered array of member objects.

---

### Exports

```js
exports.getGuildRoster = getGuildRoster;
```

Only `getGuildRoster` is exported. `getAccessToken` is internal.

---

## Error Handling Patterns

Each service uses a different error handling approach:

### axios-based services (Raider.io, EPGP)

```js
const promise = axios.get(url);
const dataPromise = promise
    .then((response) => response.data)
    .catch((error) => error);

return dataPromise;
```

**Pattern:** `.catch((error) => error)` -- returns the error object as a resolved value. This means the caller receives the error as a normal return value, not as a rejection. The caller must check whether the result is an actual data object or an Error object.

**Consequence:** Callers that don't check for errors may attempt to access properties on an Error object (e.g., `error.members` would be `undefined`), leading to silent failures or TypeErrors downstream.

### node-fetch-based services (WoW Audit)

```js
return await fetch(url, options)
    .then((response) => response.json())
    .then((response) => response.someProperty)
    .catch((err) => console.error(err));
```

**Pattern:** `.catch((err) => console.error(err))` -- logs the error and returns `undefined`. The caller receives `undefined` on failure.

**Consequence:** Callers that don't check for `undefined` may throw TypeErrors when trying to access properties (e.g., `undefined.raids`).

### node-fetch-based services (WarcraftLogs, Battle.net)

WarcraftLogs uses the same `.catch((err) => console.error(err))` pattern as WoW Audit.

Battle.net's `getAccessToken` has no `.catch()` on the token fetch -- errors will propagate as unhandled rejections.

### Summary Table

| Service | HTTP Client | Error Pattern | Return on Error | Error Propagation |
|---------|-------------|---------------|-----------------|-------------------|
| Raider.io | axios | `.catch((error) => error)` | Error object as resolved value | Silent -- caller gets Error as data |
| WoW Audit | node-fetch | `.catch((err) => console.error(err))` | `undefined` | Logged to console |
| EPGP | axios | `.catch((error) => error)` | Error object as resolved value | Silent -- caller gets Error as data |
| WarcraftLogs | node-fetch | `.catch(err => console.error(err))` | `undefined` | Logged to console |
| Battle.net | node-fetch | No `.catch()` on token; `.catch` not present on roster | Unhandled rejection | Propagates to caller |

---

## Domain Usage Map

Which domains use which services:

```
+-------------------+     +------------------+
| Raids Domain      |---->| raiderioService  |  getGuildRoster (roster sync)
|                   |---->|                  |  getPreviousWeeklyHighestMythicPlusRun (M+ reports)
|                   |---->| wowauditService  |  getUpcomingRaids (signup alerts)
|                   |---->|                  |  getHistoricalData (M+ & vault reports)
+-------------------+     +------------------+

+-------------------+     +------------------+
| Loot Domain       |---->| raiderioService  |  getRaidStaticData (encounter discovery)
+-------------------+     +------------------+

+-------------------+     +------------------+
| Guild Info Domain |---->| raiderioService  |  getRaidRankings (achievements)
|                   |---->|                  |  getRaidStaticData (raid tier data)
+-------------------+     +------------------+

+-------------------+     +------------------+
| EPGP Domain       |---->| epgpService      |  getPriorityRankings (ranking display)
+-------------------+     +------------------+

+-------------------+     +------------------+
| Trial Review      |---->| getTrialLogs.js  |  getTrialLogs (WarcraftLogs attendance)
| Domain            |     | (NOT a service)  |
+-------------------+     +------------------+

+-------------------+     +------------------+
| (None - Deprecated|     | battleNetService |  getGuildRoster (replaced by raiderioService)
+-------------------+     +------------------+
```

### Detailed Service-to-Function Mapping

| Service Function | Consumer File(s) | Domain | Usage |
|------------------|-------------------|--------|-------|
| `raiderioService.getGuildRoster` | `functions/raids/syncRaiders.js` | Raids | Periodic roster sync (every 10 min) |
| `raiderioService.getRaidRankings` | `functions/guild-info/updateAchievements.js` | Guild Info | Raid progress and world rankings |
| `raiderioService.getRaidStaticData` | `functions/loot/checkRaidExpansions.js`, `functions/guild-info/updateAchievements.js` | Loot, Guild Info | Raid/encounter discovery |
| `raiderioService.getPreviousWeeklyHighestMythicPlusRun` | `functions/raids/alertHighestMythicPlusDone.js` | Raids | Weekly M+ report (Wednesday noon) |
| `wowauditService.getUpcomingRaids` | `functions/raids/alertSignups.js` | Raids | Signup alerts (Mon/Tue/Fri/Sat 7PM) |
| `wowauditService.getHistoricalData` | `functions/raids/alertHighestMythicPlusDone.js`, `commands/raiders.js` | Raids | Weekly vault report + manual commands |
| `wowauditService.getRaidDetails` | (no current consumer found) | -- | May be unused or for debugging |
| `epgpService.getPriorityRankings` | `functions/epgp/priorityRankingPost.js` | EPGP | Priority ranking display (every 10 min) |
| `getTrialLogs` | `functions/trial-review/generateTrialLogsContent.js`, `functions/trial-review/updateTrialLogs.js` | Trial Review | Trial log links (hourly refresh) |
| `battleNetService.getGuildRoster` | (no current consumer -- deprecated) | -- | Replaced by `raiderioService.getGuildRoster` |
