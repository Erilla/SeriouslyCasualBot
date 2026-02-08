# Loot

Boss loot priority signup system. Players indicate Major/Minor/Want In/Do Not Need per boss via buttons on embed messages.

## Files

- `functions/loot/checkRaidExpansions.js` — Discovers active raids from Raider.io and creates loot posts
- `functions/loot/addLootPost.js` — Creates a loot post message for a single boss
- `functions/loot/generateLootPost.js` — Builds embed + button components for a loot post
- `functions/loot/updateLootPost.js` — Refreshes loot post with current player responses
- `functions/loot/updateLootResponse.js` — Records a player's response and updates the post
- `functions/loot/deleteLootPost.js` — Removes a loot post message and its DB entry
- `commands/loot.js` — Slash command definitions

## Flow

### Auto-Discovery

`checkRaidExpansions(client)`:
1. Starts at expansion 9 (`const initialExpansion = 9`)
2. Calls `raiderioService.getRaidStaticData(expansion)` for each expansion
3. Stops when API returns 400 status (no more expansions)
4. For each expansion's raids, checks if `new Date(raid.ends.eu) > currentDate` (active raid)
5. Creates a loot post for each encounter/boss in the active raid via `addLootPost`

### Post Creation

`addLootPost(channel, boss)`:
- `boss` object: `{ id, name, url }`
- Calls `generateLootPost` to build the embed and buttons
- Sends message to the provided channel
- Stores initial data in `lootResponses` namespace

Initial data shape:
```
{
  major: [],
  minor: [],
  wantIn: [],
  wantOut: [],
  channelId: string,
  messageId: string,
  bossName: string,
  bossUrl: string
}
```

### Embed Structure

`generateLootPost(bossName, bossId, playerResponses)`:
- Embed with 4 inline fields: Major, Minor, Want In, Do not need
- 4 buttons in a single ActionRow:

| Label | Style | Custom ID Pattern |
|-------|-------|-------------------|
| Major | `ButtonStyle.Success` (green) | `updateLootResponse\|major\|{bossId}` |
| Minor | `ButtonStyle.Primary` (blue) | `updateLootResponse\|minor\|{bossId}` |
| Want In | `ButtonStyle.Secondary` (gray) | `updateLootResponse\|wantIn\|{bossId}` |
| Do not need | `ButtonStyle.Danger` (red) | `updateLootResponse\|wantOut\|{bossId}` |

### Response Handling

Button clicks route through `interactionCreate.js` (matches `interaction.customId.startsWith('updateLootResponse')`).

`updateLootResponse(client, response, bossId, userId)`:
1. Fetches current boss loot responses from DB
2. Removes `userId` from all 4 response categories
3. Adds `userId` to the selected response category
4. Saves updated responses to DB
5. Calls `updateLootPost` to refresh the embed message
6. Returns empty string `''`

### Player Name Resolution

`updateLootPost(client, bossId)`:
- Reads all raiders from `raiders` namespace to build `{ key: name, value: userId }` array
- `generatePlayerResponseString` maps user IDs to character names via `.find(o => o.value === playerId)`
- Reconstructs the embed with resolved player names and edits the Discord message

## Keyv Namespaces

| Namespace | Key | Value |
|-----------|-----|-------|
| `lootResponses` | Boss ID (number) | `{ major: [userId], minor: [userId], wantIn: [userId], wantOut: [userId], channelId, messageId, bossName, bossUrl }` |
| `raiders` | Character name | Discord user ID (read-only, for name resolution) |

## Slash Commands

### `/loot add_post`
- No options. Creates a test loot post with hardcoded boss (id: 1, name: "Test Boss").

### `/loot delete_post`
- **Option:** `boss_id` (integer, required) — Boss ID to delete.

### `/loot delete_posts`
- **Option:** `boss_ids` (string, required) — Comma-separated boss IDs. Split by `,` and deleted via `Promise.all`.

### `/loot create_posts`
- No options. Runs `checkRaidExpansions` to auto-discover active raids and create posts.

### `/loot update_priority_post`
- **Option:** `create_post` (boolean, optional) — If true, creates new EPGP priority post. If false/omitted, updates existing one.
- Note: This subcommand bridges to the EPGP domain (`createPriorityRankingPost`/`updatePriorityRankingPost`).

## Button Custom ID Pattern

All loot buttons use: `updateLootResponse|{type}|{bossId}`

Parsed in `interactionCreate.js` via: `const [, response, bossId] = interaction.customId.split('|')`

## Config Dependencies

- `databaseString` — Keyv connection string
- `lootChannelId` — Channel where loot posts are created (used by `checkRaidExpansions`)

## External APIs

- **Raider.io** — `getRaidStaticData(expansionId)` for raid/encounter discovery
