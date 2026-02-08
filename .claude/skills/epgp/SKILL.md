# EPGP

Effort Points / Gear Points priority ranking display. Fetches from a custom EPGP API and renders fixed-width ranking tables in Discord.

## Files

- `functions/epgp/priorityRankingPost.js` — Creates, updates, and generates priority ranking posts
- `commands/epgp.js` — Slash command definitions
- `services/epgpService.js` — EPGP API client
- `commands/loot.js` — Also contains `update_priority_post` subcommand that bridges to this domain

## Functions in `priorityRankingPost.js`

### `createPriorityRankingPost(interaction)`
- Creates 3 separate messages in `priorityLootChannelId`: header, body, footer
- Stores message IDs in `priorityLootPostConfig` namespace with keys:
  - `_messageHeaderId`
  - `_messageId` (body)
  - `_messageFooterId`

### `updatePriorityRankingPost(client, interaction)`
- Fetches existing messages by stored IDs
- Regenerates content via `generatePriorityRankingsPost`
- Edits all 3 messages in place
- Runs every 10 min via cron `*/10 * * * *`

### `generatePriorityRankingsPost(tierToken?, armourType?)`
- Calls `epgpService.getPriorityRankings(tierToken, armourType)`
- Returns array of `[header, content, footer]` formatted as code blocks
- Table columns (fixed-width):
  - Character name
  - EP (Effort Points) with difference in brackets
  - GP (Gear Points) with difference in brackets
  - PR (Priority Ratio) to 3 decimal places
- Metadata includes last upload date and cutoff date for point differences

## Filtering

Available filters (mutually exclusive):

**Tier Tokens:**
- Zenith (Evoker, Monk, Rogue, Warrior)
- Dreadful (Death Knight, Demon Hunter, Warlock)
- Mystic (Druid, Hunter, Mage)
- Venerated (Paladin, Priest, Shaman)

**Armour Types:**
- Cloth, Leather, Mail, Plate

## Keyv Namespaces

| Namespace | Key | Value |
|-----------|-----|-------|
| `priorityLootPostConfig` | `_messageHeaderId` | Discord message ID |
| `priorityLootPostConfig` | `_messageId` | Discord message ID (body) |
| `priorityLootPostConfig` | `_messageFooterId` | Discord message ID |

## Slash Commands

### `/epgp get_by_token`
- **Option:** `tier_token` (string, required, choices: Zenith/Dreadful/Mystic/Venerated)
- Returns ephemeral formatted ranking table filtered by tier token.

### `/epgp get_by_armour`
- **Option:** `armour_type` (string, required, choices: Cloth/Leather/Mail/Plate)
- Returns ephemeral formatted ranking table filtered by armour type.

### `/loot update_priority_post`
- **Option:** `create_post` (boolean, optional)
- If `true`: calls `createPriorityRankingPost`. If `false`/omitted: calls `updatePriorityRankingPost`.

## Scheduled Tasks (from `events/ready.js`)

| Task | Schedule | Function |
|------|----------|----------|
| Update priority ranking post | Cron `*/10 * * * *` (every 10 min) | `updatePriorityRankingPost(client)` |

## Config Dependencies

- `databaseString` — Keyv connection string
- `priorityLootChannelId` — Channel where the 3-message ranking post is displayed

## External API

**EPGP API** (`epgpService.js`):
- Base URL: `https://epgp-api.ryanwong.uk`
- No authentication required
- Endpoints:
  - `GET /api/Points/raider/all` — All rankings
  - `GET /api/Points/raider/all/tierToken/{token}` — Filtered by tier token
  - `GET /api/Points/raider/all/armour/{type}` — Filtered by armour type
- Response includes `raiders` array, `lastUploadedDate`, and `cutOffDate`
