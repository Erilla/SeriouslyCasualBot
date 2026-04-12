# 08 -- Guild Info Embeds

> Domain directory: `functions/guild-info/` (5 files)
> Command files: `commands/guildinfo.js`, `commands/updateAchievements.js`
> Keyv namespace: `guildinfo`
> Service dependency: `services/raiderioService.js` (achievements)
> Data files: `data/aboutus.json`, `data/schedule.json`, `data/recruitment.json`, `data/achievements.json`
> Scheduled task: `setInterval` every 30 minutes (achievements only)

---

## Overview

The guild info system manages a set of informational embeds displayed in a dedicated Discord channel (`guildInfoChannelId`). The content covers four sections: About Us, Raid Schedule, Recruitment, and Achievements. A full refresh deletes all existing messages and recreates them in order. Achievements can also be updated independently and auto-refresh every 30 minutes.

---

## Files

| File | Exports | Purpose |
|------|---------|---------|
| `clearGuildInfo.js` | `clearGuildInfo(interaction)` | Delete all messages in the guild info channel and clear DB |
| `updateAboutUs.js` | `updateAboutUs(interaction)` | Post the About Us embed with link buttons |
| `updateSchedule.js` | `updateSchedule(interaction)` | Post the raid schedule embed |
| `updateRecruitment.js` | `updateRecruitment(interaction)` | Post the recruitment embed with overlord mentions |
| `updateAchievements.js` | `updateAchievements(interaction)` | Post or update the achievements progress embed |

---

## Full Refresh Sequence

**Trigger:** `/guildinfo` slash command (admin-only)

**Execution order** (sequential, from `commands/guildinfo.js`):

```
1. clearGuildInfo(interaction)
2. updateAboutUs(interaction)
3. updateSchedule(interaction)
4. updateRecruitment(interaction)
5. updateAchievements(interaction)
```

After completion, if the command was not invoked from `guildInfoChannelId`, the bot waits 1 second (`await wait(1000)`) and deletes its reply to keep the channel clean.

**Command definition:**
```js
const command = new SlashCommandBuilder()
    .setName('guildinfo')
    .setDescription('Update for Guild information sections')
    .setDefaultPermission(false);
```

**Permissions:** Restricted to `adminRoleId` via the `permissions` export:
```js
permissions: [{
    id: adminRoleId,
    type: 1,        // Role type
    permission: true,
}]
```

---

## 1. Clear Guild Info

**Function:** `clearGuildInfo(interaction)` in `clearGuildInfo.js`

**Steps:**

1. Get the guild info channel from cache: `interaction.client.channels.cache.get(guildInfoChannelId)`.
2. Fetch all messages: `channel.messages.fetch()`.
3. Delete each message: iterates with `messages.forEach(async message => await message.delete())`.
4. Clear the `guildinfo` Keyv namespace: `guildinfoData.clear()`.

**Note:** The `forEach` with `async` callbacks does not properly `await` each deletion -- all deletes fire concurrently. This could cause rate-limiting issues with many messages.

**Database instance:** `new Keyv(databaseString, { namespace: 'guildinfo' })` -- no error handler registered.

---

## 2. About Us

**Function:** `updateAboutUs(interaction)` in `updateAboutUs.js`

**Data source:** `data/aboutus.json`

**JSON schema:**
```json
{
    "title": "<:alliance:615534209712521227> About Us",
    "content": "Description text with **bold** markdown...",
    "raiderioIcon": "858702994497208340",
    "raiderioUrl": "https://raider.io/guilds/eu/silvermoon/SeriouslyCasual",
    "wowProgrsesIcon": "858703946302750740",
    "wowProgressUrl": "https://www.wowprogress.com/guild/eu/silvermoon/SeriouslyCasual",
    "warcraftLogsIcon": "858704238036123688",
    "warcraftLogsUrl": "https://www.warcraftlogs.com/guild/id/486913"
}
```

**Note:** The key `wowProgrsesIcon` has a typo ("Progrses" instead of "Progress"). This is consistent between the JSON file and the code that reads it -- both use the misspelled key.

**Embed:**

| Property | Value |
|----------|-------|
| Title | `aboutUsContent.title` (includes Alliance emoji) |
| Description | `aboutUsContent.content` |
| Color | `Colors.Green` |

**Link Buttons** (one `ActionRowBuilder` with 3 buttons):

| Label | Style | URL | Emoji ID |
|-------|-------|-----|----------|
| `'RaiderIO'` | `ButtonStyle.Link` | `aboutUsContent.raiderioUrl` | `858702994497208340` |
| `'WoWProgress'` | `ButtonStyle.Link` | `aboutUsContent.wowProgressUrl` | `858703946302750740` |
| `'Warcraft Logs'` | `ButtonStyle.Link` | `aboutUsContent.warcraftLogsUrl` | `858704238036123688` |

The emoji IDs reference custom emojis that must exist in a server the bot has access to. These are the site logos for Raider.io, WoWProgress, and WarcraftLogs respectively.

**Post:** Sent to `guildInfoChannelId` via `channel.send({ embeds: [embed], components: [row] })`.

---

## 3. Schedule

**Function:** `updateSchedule(interaction)` in `updateSchedule.js`

**Data source:** `data/schedule.json`

**JSON schema:**
```json
{
    "title": "Raid Schedule (emoji included)",
    "raidDays": ["Wednesday", "Sunday"],
    "raidTimes": ["20:00 - 23:00"],
    "timeZone": "Server Time (CEST +1)"
}
```

**Schedule Building:**

The `buildSchedule(content)` function populates a `content` object with `day` and `time` strings:

```js
function buildSchedule(content) {
    for (const raidDay of scheduleContent.raidDays) {
        content.day += raidDay + '\n';
        content.time += scheduleContent.raidTimes + '\n';
    }
}
```

For each raid day, the same `raidTimes` value is appended. With the current data this produces:
```
Day:              Time:
Wednesday         20:00 - 23:00
Sunday            20:00 - 23:00
```

**Embed:**

| Property | Value |
|----------|-------|
| Title | `scheduleContent.title` |
| Color | `Colors.Green` |
| Footer | `{ text: scheduleContent.timeZone }` |

**Fields** (3 inline fields):

| Name | Value | Inline |
|------|-------|--------|
| `'Day'` | Raid days joined with newlines | `true` |
| `'\u200b'` (zero-width space) | `'\u200b'` | `true` |
| `'Time'` | Raid times repeated per day | `true` |

The middle field is a spacer that creates visual separation between the Day and Time columns in Discord's inline field layout.

**Post:** Sent to `guildInfoChannelId`.

---

## 4. Recruitment

**Function:** `updateRecruitment(interaction)` in `updateRecruitment.js`

**Data source:** `data/recruitment.json`

**JSON schema:**
```json
{
    "title": "Recruitment (emoji included)",
    "content": [
        {
            "title": "Section Title",
            "body": "Section body text. Contact {{OVERLORDS}} if you have questions."
        }
    ]
}
```

The current recruitment.json has 4 content sections: "Who are we", "What We Want From You", "What We Can Give You", and "Need to know more? Contact these guys!".

### Overlord Token Replacement

**Token:** `'{{OVERLORDS}}'`

**Process:**

1. Fetch all overlords from the `overlords` Keyv namespace.
2. Build a string of Discord mentions joined with `' / '`:
   ```js
   async function getOverlords() {
       let result = '';
       for await (const [, value] of overlords.iterator()) {
           if (result !== '') {
               result += ' / ';
           }
           result += `<@${value}>`;
       }
       return result;
   }
   ```
   Example output: `<@123456789> / <@987654321>`
3. Replace the token in any content body that contains it:
   ```js
   if (body.includes(overlordsToken)) {
       body = body.replace(overlordsToken, overlordsString);
   }
   ```

### Embed Field Construction

The `buildRecruitmentBody(contentBody)` function builds an array of embed fields:

1. For each content entry in the JSON:
   - Create a field `{ name: content.title, value: body }` (with overlord replacement applied).
   - Push the field.
   - Push a spacer field `{ name: '\u200b', value: '\u200b' }`.
2. After the loop, remove the last spacer: `contentBody.pop()`.

This produces fields like:
```
Who are we: [text]
[spacer]
What We Want From You: [text]
[spacer]
What We Can Give You: [text]
[spacer]
Need to know more?: [text with @mentions]
```
(The trailing spacer after the last section is removed.)

### Embed

| Property | Value |
|----------|-------|
| Title | `recruitmentContent.title` |
| Fields | Built by `buildRecruitmentBody()` |
| Color | `Colors.Green` |

### Apply Button

One `ActionRowBuilder` with a single link button:

| Label | Style | URL |
|-------|-------|-----|
| `'Apply Here'` | `ButtonStyle.Link` | `applicationChannelUrl` from `config.json` |

### Allowed Mentions

The message is sent with `allowedMentions: { users: [] }` to suppress pinging the overlords. The `<@userId>` mentions still render as clickable names but do not trigger notifications.

**Post:** Sent to `guildInfoChannelId` with `{ embeds: [embed], components: [row], allowedMentions: { users: [] } }`.

**Database instance:** `new Keyv(databaseString, { namespace: 'overlords' })` -- no error handler registered.

---

## 5. Achievements

**Function:** `updateAchievements(interaction)` in `updateAchievements.js`

This is the most complex guild info function. It combines manual historical data with live API data to build a reverse-chronological achievements display.

### Data Sources

1. **Manual data** (expansions 4-5): `data/achievements.json`
2. **API data** (expansion 6+): `services/raiderioService.js`

**achievements.json schema:**
```json
{
    "title": "Current Progress & Past Achievements (emoji included)",
    "achievements": [
        {
            "raid": "Raid Name",
            "progress": "13/13M",
            "result": "**CE** WR 1170",
            "expansion": 5
        }
    ]
}
```

Current manual entries:
- Expansion 5: Hellfire Citadel (13/13M CE WR 1170), Blackrock Foundry (8/10M WR 1132), Highmaul (7/7M CE WR 1252)
- Expansion 4: Siege of Orgrimmar 10 man (14/14HC CE WR 1997)

### Module-Level State

Three module-level string variables are used to accumulate achievement data across all expansions:

```js
let raidsString = '';
let progressString = '';
let worldRankingstring = '';
```

These are reset to `''` at the start of each `updateAchievements()` call.

### Achievement Building Algorithm

**Main loop:**

1. Start at `expansion = 4`, loop `while (!complete)`.
2. **If `expansion < 6`:** Call `buildManualAchievements(expansion)` to process data from the JSON file.
3. **If `expansion >= 6`:** Call `getRaidStaticData(expansion)` from raiderioService.
   - If API returns status 400: set `complete = true` (no more expansions).
   - If response contains `raids`: process each raid (see below).
   - Otherwise: set `error = 1` and throw after processing.
4. Increment `expansion++`.
5. Call `addNewLineToAchievements()` to insert an expansion separator.

### Manual Achievement Processing

**Function:** `buildManualAchievements(expansion)`

```js
function buildManualAchievements(expansion) {
    const expansionAchieves = achievementsContent.achievements.filter(
        (achievement) => achievement.expansion === expansion,
    );
    for (const achieve of expansionAchieves) {
        raidsString = achieve.raid + '\n' + raidsString;
        progressString = achieve.progress + '\n' + progressString;
        worldRankingstring = achieve.result + '\n' + worldRankingstring + ' ';
    }
}
```

Note the **prepend pattern**: each new entry is placed before the existing string, building in reverse chronological order. The trailing space after `worldRankingstring` is intentional (present in the original code).

### API Achievement Processing (Expansion 6+)

For each expansion's raids:

1. **Sort raids** by end date ascending (null end dates sort last):
   ```js
   raidStaticDataResponse.raids.sort((a, b) => {
       if (a.ends.eu === null) return 1;
       return a.ends.eu > b.ends.eu ? 1 : -1;
   });
   ```

2. **For each raid:**
   a. Extract: `raidSlug`, `raidName` (from `raid.name`), `totalBosses` (from `raid.encounters.length`), `tierEndDate` (from `raid.ends.eu`).
   b. Call `getRaidRankings(raidSlug)` from raiderioService.
   c. Process the ranking response.

3. **Ranking selection:** If more than 2 rankings are returned (multiple entries for the guild), select the one with the most `encountersDefeated`. Otherwise use the first ranking.

4. **Calculate killed bosses:** `raidRanking?.encountersDefeated?.length`

5. **Only display raids where `killedBosses` is truthy** (non-zero, non-undefined).

### Cutting Edge Detection

**Function:** `checkIsCuttingEdge(raid, tierEndDate, raidRanking, killedBosses, totalBosses)`

```js
function checkIsCuttingEdge(raid, tierEndDate, raidRanking, killedBosses, totalBosses) {
    // Fated raids didn't have CE
    if (raid.name.startsWith('Fated')) return false;

    const lastBossSlug = raid.encounters[raid.encounters.length - 1].slug;
    const firstDefeatedDate = raidRanking?.encountersDefeated.find(
        (encounter) => encounter.slug === lastBossSlug,
    )?.firstDefeated;

    return (
        (tierEndDate !== null &&
            Date.parse(firstDefeatedDate) < Date.parse(tierEndDate)) ||
        (tierEndDate === null && killedBosses === totalBosses)
    );
}
```

**Logic:**

1. **Fated raids excluded:** Any raid whose name starts with `'Fated'` immediately returns `false`.
2. Find the last boss of the raid (last encounter in the encounters array).
3. Find the guild's first-defeated date for that boss from the ranking data.
4. **If the tier has ended** (`tierEndDate !== null`): CE is awarded if the last boss was defeated before the tier end date.
5. **If the tier is ongoing** (`tierEndDate === null`): CE is awarded if all bosses are killed (`killedBosses === totalBosses`).

### World Ranking Format

**Function:** `getRaidWorldRanking(tierEndDate, raidRanking, isCuttingEdge)`

| Condition | Output |
|-----------|--------|
| Not CE and tier ongoing (`tierEndDate === null`) | `'**In Progress**'` |
| CE achieved | `'**CE** WR ${raidRanking?.rank}'` |
| Not CE, tier ended | `'\u200b WR ${raidRanking?.rank}'` |

### Progress Format

`'${killedBosses}/${totalBosses}M'` (e.g., `"8/9M"`)

### Reverse Chronological Build

**Function:** `buildAchievement(raidName, progress, worldRanking)`

```js
function buildAchievement(raidName, progress, worldRanking) {
    raidsString = raidName + '\n' + raidsString;
    progressString = progress + '\n' + progressString;
    worldRankingstring = worldRanking + '\n' + worldRankingstring + ' ';
}
```

Each new achievement is **prepended** to the existing strings, so the most recent raid ends up at the top.

### Expansion Separator

**Function:** `addNewLineToAchievements()`

```js
function addNewLineToAchievements() {
    raidsString = '\n' + raidsString;
    progressString = '\n' + progressString;
    worldRankingstring = '\n' + worldRankingstring;
}
```

Adds a blank line between expansions in the display.

### Posting Achievements

**Function:** `postAchievements(interaction)`

**Embed:**

| Property | Value |
|----------|-------|
| Title | `achievementsContent.title` (from JSON) |
| Color | `Colors.Green` |

**Fields** (3 inline fields):

| Name | Value | Inline |
|------|-------|--------|
| `'Raid'` | `raidsString` | `true` |
| `'\u200b'` | `progressString` | `true` |
| `'\u200b'` | `worldRankingstring` | `true` |

**Update-or-Create Logic:**

1. Check for stored `achievementsPostId` in the `guildinfo` namespace.
2. **If exists:** Fetch the message and edit it with the new embed. If the fetch fails (message deleted), fall through to create.
3. **If not exists (or fetch failed):** Send a new message and store its ID:
   ```js
   channel.send({ embeds: [embed] }).then((response) => {
       guildinfoData.set('achievementsPostId', response.id);
   });
   ```

This means the achievements embed persists across full refreshes -- if the ID is stored and the message exists, it is edited rather than recreated. However, `clearGuildInfo` calls `guildinfoData.clear()` which deletes the stored ID, so a full refresh will always create a new message.

---

## Standalone Achievements Update

**Command:** `/updateachievements` (defined in `commands/updateAchievements.js`)

```js
const command = new SlashCommandBuilder()
    .setName('updateachievements')
    .setDescription('Updates achievements')
    .setDefaultPermission(false);
```

**Permissions:** Same as `/guildinfo` -- restricted to `adminRoleId`.

**Behavior:**
1. Reply with `'Updates achievements...'`.
2. Call `updateAchievements(interaction)` (fire-and-forget -- not awaited).
3. Wait 1 second, delete the reply.

**Note:** Because `updateAchievements` is not awaited, the reply is deleted before achievements finish updating. Any errors during the update will not be surfaced to the user.

---

## Scheduled Auto-Update

**Task:** `updateAchievements({ client })` every 30 minutes (1,800,000ms)

**Registered in:** `events/ready.js` via `setInterval`

**Note:** The function signature expects an `interaction` object, but the scheduled call passes `{ client }`. The function accesses `interaction.client`, so passing `{ client }` works because `{ client }.client === client`. This pattern is a workaround rather than a clean interface.

**Error handling:** Wrapped in `try/catch` with `console.log` on failure.

---

## Raider.io Integration

The achievements system uses two Raider.io endpoints:

1. **`getRaidStaticData(expansion_id)`**: Returns raid metadata (names, encounters, end dates) for an expansion. Used to discover all raids from expansion 6 onward. Stops when API returns 400.

2. **`getRaidRankings(raidSlug)`**: Returns world ranking data for a specific raid.
   - URL: `https://raider.io/api/v1/raiding/raid-rankings?raid=${slug}&difficulty=mythic&region=world&guilds=1061585%2C43113&limit=50`
   - The `guilds` parameter is a URL-encoded comma-separated list of guild IDs (hardcoded in raiderioService.js as `'1061585%2C43113'`).
   - Response contains `raidRankings` array, each with `rank`, `encountersDefeated` (array of `{ slug, firstDefeated }`).

---

## Cross-Domain Dependencies

| Dependency | Direction | Detail |
|-----------|-----------|--------|
| `overlords` namespace | Read | Recruitment reads overlord user IDs for mention formatting |
| `guildinfo` namespace | Read/Write | Achievements stores/reads `achievementsPostId` |
| `raiderioService` | API | Static data + raid rankings for achievements |
| `config.json` | Config | `guildInfoChannelId`, `applicationChannelUrl`, `databaseString`, `adminRoleId` |
| `data/*.json` | Static content | All 4 JSON data files |

---

## Rebuild Checklist

1. Create all 5 files in `functions/guild-info/`.
2. Create `data/aboutus.json`, `data/schedule.json`, `data/recruitment.json`, `data/achievements.json` with the schemas documented above.
3. Register `/guildinfo` in `commands/guildinfo.js` with `setDefaultPermission(false)` and admin role permission.
4. Register `/updateachievements` in `commands/updateAchievements.js` with the same permission scheme.
5. Register the 30-minute `setInterval` for `updateAchievements` in `events/ready.js`.
6. Ensure custom emoji IDs (858702994497208340, 858703946302750740, 858704238036123688) exist in an accessible server.
7. Ensure overlords are populated in the `overlords` namespace before running recruitment.
8. Ensure `guildInfoChannelId` and `applicationChannelUrl` are set in `config.json`.
