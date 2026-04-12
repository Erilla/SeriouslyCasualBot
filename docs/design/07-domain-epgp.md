# 07 -- EPGP Priority Rankings

> Domain directory: `functions/epgp/` (1 file: `priorityRankingPost.js`, 138 lines)
> Command file: `commands/epgp.js`
> Also accessed via: `commands/loot.js` (`update_priority_post` subcommand)
> Keyv namespace: `priorityLootPostConfig`
> Service dependency: `services/epgpService.js`
> Scheduled task: cron `*/10 * * * *` (every 10 minutes)

---

## Overview

EPGP (Effort Points / Gear Points) is a loot distribution system. The bot maintains a live-updating three-message display in a dedicated Discord channel showing a ranked table of raiders with their EP, GP, and Priority Rating (PR). The display auto-refreshes every 10 minutes via cron. Raiders can also query filtered views via slash commands.

---

## Three-Message Architecture

The EPGP display uses three separate Discord messages posted in sequence to a single channel (`priorityLootChannelId` from `config.json`). This split exists because Discord messages have a 2000-character limit, and a full raider table can exceed it.

| Message | Keyv Key | Content |
|---------|----------|---------|
| Header | `_messageHeaderId` | Filter label (if any) + column headers |
| Body | `_messageId` | Raider data rows |
| Footer | `_messageFooterId` | Timestamps (last upload, cutoff date) |

**Keyv namespace:** `priorityLootPostConfig`

**Key constants in code:**
```js
const messageHeaderIdKey = '_messageHeaderId';
const messageBodyIdKey = '_messageId';
const messageFooterIdKey = '_messageFooterId';
```

---

## Message Content Format

All three messages share the same CSS code block prefix. The function `generatePriorityRankingsPost(tierToken?, armourType?)` builds all three in a single call and returns them as a 3-element array `[header, body, footer]`.

### Shared Prefix Construction

```js
let content = '```css\n';

if (tierToken) content += `Filtered by ${tierToken} token\n`;
else if (armourType) content += `Filtered by ${armourType}\n`;
```

This prefix is assigned to both `header` and `footer` as starting points, then each diverges. The `content` variable continues building the body.

### Header Message

The header starts from the shared prefix, appends column headers, and closes:

```
```css
[optional: Filtered by {tierToken} token / Filtered by {armourType}]
[Name]         [EP]         [GP]           [PR]
```
```

Column headers are formatted using `formatColumn()`:
```js
header += `${formatColumn('[Name]', 15)}${formatColumn('[EP]', 13)}${formatColumn('[GP]', 13)}${formatColumn('  [PR]', 13)}\n`;
header += '```';
```

### Body Message

The body starts from the shared prefix (including any filter line), then appends one row per raider:

```
```css
[optional filter line]
RaiderName     100 [+10]    50 [-5]      2.000
AnotherRaider  80 [0]       40 [+3]      2.000
```
```

**Per-raider row construction:**
```js
`${formatColumn(raider.characterName, 15)}${formatColumn(
    `${raider.points.effortPoints} [${epDifference}]`, 13
)}${formatColumn(
    `${raider.points.gearPoints} [${gpDifference}]`, 13
)}${(Math.round(raider.points.priority * 100) / 100).toFixed(3)}\n`
```

**EP/GP difference formatting:**
- If the difference is positive (`+epDifference > 0`), prefix with `+`: `epDifference = '+' + epDifference`
- If zero or negative, displayed as-is (e.g., `0`, `-5`)
- The positivity check uses unary `+` for coercion: `+epDifference > 0`

**Priority calculation:**
```js
(Math.round(raider.points.priority * 100) / 100).toFixed(3)
```
This rounds to 2 decimal places via multiply-round-divide, then formats to 3 decimal places with `toFixed(3)`. This means the third decimal is always `0` (e.g., `2.130` not `2.133`).

### Footer Message

The footer starts from the shared prefix, adds two blank lines, then timestamp lines:

```
```css
[optional filter line]


[Last Upload: {UTC date string}]
[Cutoff Date for point differences: {UTC date string}]
```
```

**Construction:**
```js
footer += `\n\n[Last Upload: ${new Date(response.lastUploadedDate).toUTCString()}]`;
footer += `\n[Cutoff Date for point differences: ${new Date(response.cutOffDate).toUTCString()}]`;
footer += '```';
```

---

## Column Formatting

**Constants:**
```js
const nameColumnLength = 15;
const numberColumnLength = 13;
```

**Function:**
```js
const formatColumn = (value, length) => {
    const spacesNeeded = length - value.toString().length;
    let result = value;
    result += ' '.repeat(spacesNeeded);
    return result;
};
```

Pads the value with trailing spaces to reach the target column width. If the value exceeds the column length, `spacesNeeded` becomes negative and `' '.repeat(negative)` throws a `RangeError`. This means character names longer than 15 characters or EP/GP strings longer than 13 characters would cause a runtime error.

---

## EPGP Service

**File:** `services/epgpService.js` (22 lines)

**Function:** `getPriorityRankings(tierToken, armourType)`

**Base URL:** `https://epgp-api.ryanwong.uk/api/Points/raider/all`

**URL construction:**
- If `tierToken` is provided: append `/tierToken/${tierToken}`
- Else if `armourType` is provided: append `/armour/${armourType}`
- Otherwise: use base URL (all raiders, unfiltered)

**Error handling:** `.catch((error) => error)` -- returns the error object as a resolved value.

**Response shape** (consumed by `generatePriorityRankingsPost`):
```json
{
    "raiders": [
        {
            "characterName": "string",
            "points": {
                "effortPoints": "number",
                "effortPointsDifference": "number",
                "gearPoints": "number",
                "gearPointsDifference": "number",
                "priority": "number"
            }
        }
    ],
    "lastUploadedDate": "ISO date string",
    "cutOffDate": "ISO date string"
}
```

---

## Filtering

**Tier Tokens** (mutually exclusive with armour types; tier token takes priority):

| Token | Classes |
|-------|---------|
| Zenith | Evoker, Monk, Rogue, Warrior |
| Dreadful | Death Knight, Demon Hunter, Warlock |
| Mystic | Druid, Hunter, Mage |
| Venerated | Paladin, Priest, Shaman |

**Armour Types:**

| Type | Classes |
|------|---------|
| Cloth | Mage, Priest, Warlock |
| Leather | Demon Hunter, Druid, Monk, Rogue |
| Mail | Evoker, Hunter, Shaman |
| Plate | Death Knight, Paladin, Warrior |

In `generatePriorityRankingsPost(tierToken, armourType)`:
- If `tierToken` is truthy: filter by token (armourType ignored even if provided)
- Else if `armourType` is truthy: filter by armour
- Otherwise: show all raiders

The filter label in the prefix reflects which was applied:
- `Filtered by ${tierToken} token` (e.g., `Filtered by Zenith token`)
- `Filtered by ${armourType}` (e.g., `Filtered by Cloth`)

---

## Creating the Priority Ranking Post

**Function:** `createPriorityRankingPost(interaction)`

**Trigger:** `/loot update_priority_post` with `create_post: true`

**Steps:**

1. Call `generatePriorityRankingsPost()` (no filters) to get `[header, post, footer]`.
2. Fetch the channel at `priorityLootChannelId`.
3. Send header message, store its ID: `priorityLootPostConfig.set('_messageHeaderId', headerMessage.id)`.
4. Send body message, store its ID: `priorityLootPostConfig.set('_messageId', bodyMessage.id)`.
5. Send footer message, store its ID: `priorityLootPostConfig.set('_messageFooterId', footerMessage.id)`.
6. Edit the interaction reply: `'Created Priority Ranking Post'` (ephemeral).

The three sends are chained via nested `.then()` calls to guarantee sequential ordering in the channel.

---

## Updating the Priority Ranking Post

**Function:** `updatePriorityRankingPost(client, interaction?)`

**Triggers:**
- Cron `*/10 * * * *` (every 10 minutes) from `events/ready.js` -- `interaction` is `undefined`
- `/loot update_priority_post` without `create_post: true` -- `interaction` is provided

**Steps:**

1. Fetch stored message IDs:
   ```js
   const messageBodyId = await priorityLootPostConfig.get(messageBodyIdKey);
   const messageHeaderId = await priorityLootPostConfig.get(messageFooterIdKey);
   ```
2. Call `generatePriorityRankingsPost()` to get `[, post, footer]` (header is destructured away with `,`).
3. Fetch the channel, then edit the body message with `post` and the footer message with `footer`.
4. If `interaction` is provided, edit the interaction reply: `'Updated Priority Ranking Post'` (ephemeral).

**Bug: Misleading variable name on line 43.** The variable is named `messageHeaderId` but it fetches the value for `messageFooterIdKey` (`'_messageFooterId'`). This is a naming-only bug -- the variable actually holds the footer message ID, and it is used to edit the footer message with the footer content. The behavior is correct; only the variable name is wrong.

**Design note:** Only the body and footer are updated on auto-refresh. The header (column names) never changes, so it is not re-fetched or re-edited. This is why `generatePriorityRankingsPost()` returns a 3-element array but the update function only uses elements `[1]` and `[2]`.

---

## Slash Command Interface

### /epgp Command (`commands/epgp.js`)

| Subcommand | Parameter | Behavior |
|------------|-----------|----------|
| `get_by_token` | `tier_token` (string choice, required) | Replies ephemeral with `generatePriorityRankingsPost(tierToken)`. Choices: Zenith, Dreadful, Mystic, Venerated. |
| `get_by_armour` | `armour_type` (string choice, required) | Replies ephemeral with `generatePriorityRankingsPost(null, armourType)`. Choices: Cloth, Leather, Mail, Plate. |

**Choice labels** (shown to users):
- Zenith: `'Zenith (Evoker, Monk, Rogue, Warrior)'`
- Dreadful: `'Dreadful (Death Knight, Demon Hunter, Warlock)'`
- Mystic: `'Mystic (Druid, Hunter, Mage)'`
- Venerated: `'Venerated (Paladin, Priest, Shaman)'`

**Flow:**
1. Reply with loading message: `'Retrieving rankings by ${token/armour}...'` (ephemeral).
2. Call `generatePriorityRankingsPost(tierToken)` or `generatePriorityRankingsPost(null, armourType)`.
3. Edit reply with the result.

**Note:** The `/epgp` command returns the full 3-element array as the reply content. Since Discord expects a string, this results in the array being stringified. This means the ephemeral reply shows all three messages concatenated as a single message (header + body + footer), not split across three messages.

### /loot update_priority_post Subcommand

See [06-domain-loot.md](06-domain-loot.md) for the full `/loot` command. The `update_priority_post` subcommand:
- With `create_post: true`: calls `createPriorityRankingPost(interaction)` -- creates 3 new messages
- Without `create_post` (or false): calls `updatePriorityRankingPost(interaction.client, interaction)` -- edits existing messages

---

## Auto-Update Schedule

**Cron expression:** `*/10 * * * *` (every 10 minutes)

**Registered in:** `events/ready.js`

**Call:** `updatePriorityRankingPost(client)` (no interaction parameter)

**Error handling:** None -- cron tasks in `ready.js` have no try/catch wrapping. If the EPGP API is down or the stored message IDs are invalid, the error propagates unhandled.

---

## Cross-Domain Dependencies

| Dependency | Direction | Detail |
|-----------|-----------|--------|
| `epgpService` | API | `getPriorityRankings()` fetches data from external EPGP API |
| `config.json` | Config | `priorityLootChannelId`, `databaseString` |
| `/loot` command | Entry point | `update_priority_post` subcommand triggers create/update |
| `ready.js` | Scheduler | Cron job calls `updatePriorityRankingPost` every 10 minutes |

---

## Rebuild Checklist

1. Create `functions/epgp/priorityRankingPost.js` with three exported functions: `generatePriorityRankingsPost`, `createPriorityRankingPost`, `updatePriorityRankingPost`.
2. Create `services/epgpService.js` with `getPriorityRankings(tierToken, armourType)`.
3. Register the `/epgp` slash command in `commands/epgp.js` with `get_by_token` and `get_by_armour` subcommands including choice arrays.
4. Add the `update_priority_post` subcommand to `/loot` in `commands/loot.js`.
5. Register the cron job `*/10 * * * *` in `events/ready.js`.
6. Ensure `priorityLootChannelId` is set in `config.json`.
7. Create the initial post via `/loot update_priority_post create_post:true` before the cron job can update.
