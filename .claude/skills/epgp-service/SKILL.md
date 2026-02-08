# EPGP Service

Wrapper for a custom EPGP (Effort Points / Gear Points) REST API. Provides guild member priority rankings with optional filtering by tier token or armour type. No authentication required.

**File:** `services/epgpService.js`
**HTTP Client:** `axios`
**Base URL:** `https://epgp-api.ryanwong.uk`

## Functions

### `getPriorityRankings(tierToken, armourType)`

Returns EPGP priority rankings for all raiders, optionally filtered.

- **Parameters:**
  - `tierToken` (string, optional) — Filter by tier token. One of: `"Zenith"`, `"Dreadful"`, `"Mystic"`, `"Venerated"`
  - `armourType` (string, optional) — Filter by armour type. One of: `"Cloth"`, `"Leather"`, `"Mail"`, `"Plate"`
  - Filters are mutually exclusive — `tierToken` takes priority if both are provided

- **Endpoint selection:**
  - No filter: `GET /api/Points/raider/all`
  - With tier token: `GET /api/Points/raider/all/tierToken/{tierToken}`
  - With armour type: `GET /api/Points/raider/all/armour/{armourType}`

- **Returns:** Object containing:
  - `raiders` — Array of raider objects with EP, GP, and priority ratio data
  - `lastUploadedDate` — ISO timestamp of when data was last uploaded
  - `cutOffDate` — ISO timestamp used as baseline for point difference calculations

- **Error handling:** Returns the axios error object on failure (`.catch((error) => error)`)

**Consumers:**
- `functions/epgp/priorityRankingPost.js` — Generates formatted ranking tables for Discord display

## Tier Token to Class Mapping

| Token | Classes |
|-------|---------|
| Zenith | Evoker, Monk, Rogue, Warrior |
| Dreadful | Death Knight, Demon Hunter, Warlock |
| Mystic | Druid, Hunter, Mage |
| Venerated | Paladin, Priest, Shaman |

## Armour Types

| Type | Classes |
|------|---------|
| Cloth | Mage, Priest, Warlock |
| Leather | Demon Hunter, Druid, Monk, Rogue |
| Mail | Evoker, Hunter, Shaman |
| Plate | Death Knight, Paladin, Warrior |

## Exports

Single export (line 21):
- `getPriorityRankings`

## Config Dependencies

None. This service has no config.json imports — the API URL is hardcoded and requires no auth.

## Error Handling Pattern

Same as `raiderioService.js`:
```javascript
const promise = axios.get(url);
const dataPromise = promise
    .then((response) => response.data)
    .catch((error) => error);
return dataPromise;
```
On error, the **error object itself** is returned as the resolved value. The function is **not async** (no `async` keyword) — it returns a promise directly.

## Endpoint Verification (Feb 2026)

All endpoints verified as live and returning expected data:

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/Points/raider/all` | Verified | Returns `raiders` array, `lastUploadedDate`, `cutOffDate`. Each raider has `characterName`, `class`, `points` (with `effortPoints`, `gearPoints`, `priority`), `active` |
| `GET /api/Points/raider/all/tierToken/Zenith` | Verified | Correctly filters to Evoker, Monk, Rogue, Warrior |
| `GET /api/Points/raider/all/armour/Plate` | Verified | Correctly filters to Death Knight, Paladin, Warrior |

No authentication required. Custom API hosted at `epgp-api.ryanwong.uk`.

## Consumer Map

| Function | Used By Domain | Used By File |
|----------|---------------|-------------|
| `getPriorityRankings` | EPGP | `functions/epgp/priorityRankingPost.js` |
