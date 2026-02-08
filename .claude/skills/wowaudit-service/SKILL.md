# WoW Audit Service

Wrapper for the WoW Audit REST API. Provides raid scheduling/signup data and historical character performance data (M+ dungeons, Great Vault). Requires API secret authentication.

**File:** `services/wowauditService.js`
**HTTP Client:** `node-fetch`
**Base URL:** `https://wowaudit.com/v1/`

## Authentication

All requests use a shared `generateQueryOptions()` helper that sets:
```javascript
{
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `${wowAuditApiSecret}`,
    },
}
```
The `wowAuditApiSecret` value comes directly from `config.json`. It is passed as-is in the `Authorization` header (no `Bearer` prefix).

## Functions

### `getUpcomingRaids()`

Returns all future scheduled raids.

- **Endpoint:** `GET /raids?include_past=false`
- **Returns:** Array of raid objects from `response.raids`, each containing:
  - `id` — Raid ID (used with `getRaidDetails`)
  - `date` — Scheduled date
  - `difficulty` — e.g. `"Mythic"`, `"Heroic"`
  - `status` — e.g. `"Planned"`, `"Cancelled"`
- **Error handling:** Logs error to console, returns `undefined`

**Consumers:**
- `functions/raids/getCurrentSignupsForNextRaid.js` — Finds the next Mythic/Planned raid to check signups

---

### `getRaidDetails(id)`

Returns detailed information about a specific raid, including signups.

- **Endpoint:** `GET /raids/{id}}`
  - **Note:** There is an extra `}` in the URL template on line 16: `` `https://wowaudit.com/v1/raids/${id}}` ``. This is a typo but may not cause issues if the API ignores trailing characters.
- **Params:** `id` — Numeric raid ID from `getUpcomingRaids()`
- **Returns:** Full raid object containing:
  - `signups` — Array of `{ character: { name }, status }` objects
  - Status values include: `"Unknown"` (not signed), `"Confirmed"`, `"Tentative"`, `"Declined"`, `"Late"`, etc.
- **Error handling:** Logs error to console, returns `undefined`

**Consumers:**
- `functions/raids/getCurrentSignupsForNextRaid.js` — Gets signup list for the next raid, filters for `"Unknown"` status

---

### `getHistoricalData()`

Returns character performance data from the previous WoW Audit period (weekly reset cycle).

- **Endpoint:** `GET /historical_data?period={previousPeriod}`
- **Process:**
  1. Calls `getCurrentPeriod()` to get current period number
  2. Subtracts 1 to get previous period: `+(await getCurrentPeriod()) - 1`
  3. Fetches historical data for that period
- **Returns:** Array of character objects from `response.characters`, each containing:
  - `name` — Character name
  - `data.dungeons_done` — Array of M+ dungeon completions with levels
  - `data.vault_options` — Great Vault data:
    - `raids` — `{ option_1, option_2, option_3 }`
    - `dungeons` — `{ option_1, option_2, option_3 }`
    - `world` — `{ option_1, option_2, option_3 }` (Delves)
- **Error handling:** Logs error to console, returns `undefined`

**Consumers:**
- `functions/raids/alertHighestMythicPlusDone.js` — Builds M+ and vault .txt reports for weekly reset
- `commands/raiders.js` — Manual `/raiders previous_highest_mythicplus` and `/raiders previous_great_vault` commands

---

### `getCurrentPeriod()`

Returns the current WoW Audit period number (internal to WoW Audit's weekly tracking).

- **Endpoint:** `GET /period`
- **Returns:** Numeric period from `response.current_period`
- **Error handling:** Logs error to console, returns `undefined`
- **Note:** Not exported. Used internally by `getHistoricalData()` only.

**Consumers:**
- Internal only (called by `getHistoricalData`)

## Exports

Only 3 of 4 functions are exported (line 55-57):
- `getUpcomingRaids`
- `getRaidDetails`
- `getHistoricalData`

`getCurrentPeriod` is **not exported** — it is an internal helper.

## Config Dependencies

| Config Key | Purpose |
|------------|---------|
| `wowAuditApiSecret` | Authorization header value for all API requests |

## Error Handling Pattern

All functions follow the same pattern:
```javascript
return await fetch(url, generateQueryOptions())
    .then((response) => response.json())
    .then((response) => response.{field})
    .catch((err) => console.error(err));
```
On error, the error is logged to console and the function returns `undefined`. This differs from `raiderioService.js` which returns the error object.

## Endpoint Verification (Feb 2026)

WoW Audit API documentation is not publicly available. Endpoints could not be independently verified via web search or public docs.

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /v1/raids?include_past=false` | Unverifiable | Requires API secret auth. No public docs found |
| `GET /v1/raids/{id}` | Unverifiable | Has URL typo (`${id}}` — double `}`) in code. May still work if API ignores trailing chars |
| `GET /v1/historical_data?period={n}` | Unverifiable | Requires API secret auth |
| `GET /v1/period` | Unverifiable | Requires API secret auth |

The API requires a secret passed via the `Authorization` header. No public documentation or OpenAPI spec was found. The [WoW Audit GitHub](https://github.com/wowaudit) has a `core` repository but it contains application constants, not API route definitions.

## Consumer Map

| Function | Used By Domain | Used By File |
|----------|---------------|-------------|
| `getUpcomingRaids` | Raids | `functions/raids/getCurrentSignupsForNextRaid.js` |
| `getRaidDetails` | Raids | `functions/raids/getCurrentSignupsForNextRaid.js` |
| `getHistoricalData` | Raids | `functions/raids/alertHighestMythicPlusDone.js`, `commands/raiders.js` |
