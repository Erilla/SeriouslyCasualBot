# Battle.net Service

**Status: Deprecated.** This service is no longer actively used. Guild roster fetching was replaced by Raider.io (`raiderioService.js`) because the Battle.net API was broken. See commit message: *"Changed to use raiderio to get guild roster (battle.net is broken)"*.

The file remains in the codebase but has no active consumers.

**File:** `services/battleNetService.js`
**HTTP Client:** `node-fetch`

## Authentication

Uses OAuth2 Client Credentials flow:

1. Encodes `bnetClientId:bnetClientSecret` as Base64
2. POSTs to `https://oauth.battle.net/token` with:
   - `Authorization: Basic {encoded}`
   - `Content-Type: application/x-www-form-urlencoded`
   - Body: `grant_type=client_credentials`
3. Extracts `access_token` from JSON response

## Functions

### `getAccessToken()`

Internal helper. Performs OAuth2 client credentials flow.

- **Endpoint:** `POST https://oauth.battle.net/token`
- **Returns:** Access token string

### `getGuildRoster()`

Returns guild member roster. Functionally equivalent to `raiderioService.getGuildRoster()` but uses Battle.net API.

- **Endpoint:** `GET https://eu.api.blizzard.com/data/wow/guild/{realm}/{guild}/roster`
- **Query params:** `namespace=profile-eu`, `locale=en_US`, `access_token={token}`
- **Post-processing:** Filters to ranks `[0, 1, 3, 4, 5, 7]` AND `character.level >= 10`
- **Returns:** Filtered member array

## Exports

Single export (line 41):
- `getGuildRoster`

(`getAccessToken` is internal only)

## Config Dependencies

| Config Key | Purpose |
|------------|---------|
| `bnetClientId` | OAuth2 client ID |
| `bnetClientSecret` | OAuth2 client secret |

## Hardcoded Values

| Value | Location | Purpose |
|-------|----------|---------|
| `'seriouslycasual'` | Line 5 (`guildId`) | Guild name |
| `'silvermoon'` | Line 6 (`guildServer`) | Realm |
| `[0, 1, 3, 4, 5, 7]` | Line 37 | Rank filter |
| `>= 10` | Line 37 | Minimum character level filter |

## Differences from Raider.io Equivalent

| Aspect | Battle.net | Raider.io |
|--------|-----------|-----------|
| Auth | OAuth2 required | None |
| Level filter | `>= 10` | None |
| HTTP client | `node-fetch` | `axios` |
| Status | Deprecated | Active |

## Endpoint Verification (Feb 2026)

Battle.net API endpoints are well-documented by Blizzard but this service is deprecated and unused.

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST https://oauth.battle.net/token` | Known valid | Standard Blizzard OAuth2 endpoint |
| `GET https://eu.api.blizzard.com/data/wow/guild/{realm}/{guild}/roster` | Known valid | Standard Blizzard Game Data API. Was reported broken at time of deprecation |

**API Documentation:** [Battle.net API Docs](https://develop.battle.net/documentation/world-of-warcraft)

## Consumer Map

No active consumers. This service is unused.
