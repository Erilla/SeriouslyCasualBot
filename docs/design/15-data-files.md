# 15 -- Data Files

All static and generated JSON data files in the `data/` directory. This document covers the full structure of each file, its consumers and writers, and guidelines for editing.

---

## Overview

| File | Type | Consumer | Writer | Safe to Edit |
|------|------|----------|--------|-------------|
| `aboutus.json` | Static | `updateAboutUs()` | Manual edit | Yes |
| `achievements.json` | Static | `updateAchievements()` (expansions 4-5 only) | Manual edit | Yes |
| `schedule.json` | Static | `updateSchedule()` | Manual edit | Yes |
| `recruitment.json` | Static | `updateRecruitment()` | Manual edit | Yes |
| `raidersSeedData.json` | Static | `addRaiders()` (initial seed) | Manual edit | Yes |
| `raiders.json` | Generated | `addRaiders()` (re-seed) | `updateRaiderJsonData()` | No (auto-generated) |
| `signupAlertMessages.json` | Static | `alertSignups()` | Manual edit | Yes |

---

## aboutus.json

**Purpose:** Content for the About Us embed posted in the guild info channel.

**Consumer:** `functions/guild-info/updateAboutUs.js`

**Full Structure:**

```json
{
    "title": "<:alliance:615534209712521227> About Us",
    "content": "**<SeriouslyCasual>** is a two-day Alliance mythic raiding guild. We were founded in 2013 and continue to progress every raid tier at Silvermoon-EU.\n\nOur aim is to obtain every Cutting Edge achievement there is while respecting the fact this game is NOT someone's second job.\n\nIf you're a fan of banter, memes, and high-end progression, then welcome to your new home.",
    "wowProgrsesIcon": "858703946302750740",
    "wowProgressUrl": "https://www.wowprogress.com/guild/eu/silvermoon/SeriouslyCasual",
    "raiderioIcon": "858702994497208340",
    "raiderioUrl": "https://raider.io/guilds/eu/silvermoon/SeriouslyCasual",
    "warcraftLogsIcon": "858704238036123688",
    "warcraftLogsUrl": "https://www.warcraftlogs.com/guild/id/486913"
}
```

**Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Embed title. Includes a custom Discord emoji `<:alliance:615534209712521227>` |
| `content` | string | Embed description. Supports Discord markdown (bold, newlines) |
| `wowProgrsesIcon` | string | Discord emoji ID for the WoWProgress button icon. Note: the key has a typo (`Progrses` instead of `Progress`) |
| `wowProgressUrl` | string | URL for the WoWProgress link button |
| `raiderioIcon` | string | Discord emoji ID for the Raider.IO button icon |
| `raiderioUrl` | string | URL for the Raider.IO link button |
| `warcraftLogsIcon` | string | Discord emoji ID for the WarcraftLogs button icon |
| `warcraftLogsUrl` | string | URL for the WarcraftLogs link button |

**How it is rendered:**

The `updateAboutUs` function creates:
1. An embed with `Colors.Green`, the title, and the content as the description
2. An ActionRow with 3 `ButtonStyle.Link` buttons, each using the emoji ID and URL from this file:
   - Raider.IO button (emoji `858702994497208340`)
   - WoWProgress button (emoji `858703946302750740`)
   - WarcraftLogs button (emoji `858704238036123688`)

**Editing Notes:**
- The emoji IDs reference custom server emojis. If the bot moves to a different server, these IDs must be updated.
- The `title` field contains a raw Discord emoji string. Changing the emoji requires the new emoji's ID from the target server.
- The `content` field uses Discord markdown. `**text**` renders as bold. `\n` is a literal newline in the JSON string.

---

## achievements.json

**Purpose:** Manual achievement data for older expansions (4-5) that are not available via the Raider.io API. Expansion 6+ achievements are fetched dynamically from Raider.io.

**Consumer:** `functions/guild-info/updateAchievements.js`

**Full Structure:**

```json
{
    "title": "Current Progress & Past Achievements",
    "achievements": [
        {
            "raid": "Hellfire Citadel",
            "progress": "13/13M",
            "result": "**CE** WR 1170",
            "expansion": 5
        },
        {
            "raid": "Blackrock Foundry",
            "progress": "8/10M",
            "result": "WR 1132",
            "expansion": 5
        },
        {
            "raid": "Highmaul",
            "progress": "7/7M",
            "result": "**CE** WR 1252",
            "expansion": 5
        },
        {
            "raid": "Siege of Orgrimmar (10 man)",
            "progress": "14/14HC",
            "result": "**CE** WR 1997",
            "expansion": 4
        }
    ]
}
```

**Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Title for the achievements embed (note: the emoji is added programmatically, not in the JSON) |
| `achievements` | array | Array of achievement objects, ordered newest to oldest |
| `achievements[].raid` | string | Raid instance name |
| `achievements[].progress` | string | Kill progress (e.g., `"13/13M"`, `"14/14HC"`) |
| `achievements[].result` | string | Result text. Uses `**CE**` (bold markdown) for Cutting Edge, `WR` = World Rank |
| `achievements[].expansion` | number | WoW expansion number (4 = Mists of Pandaria, 5 = Warlords of Draenor) |

**How it is rendered:**

The `updateAchievements` function:
1. Loads this file for expansions 4-5 (manual data)
2. Fetches expansion 6+ data from Raider.io API dynamically
3. Builds three parallel columns: Raid Name, Progress, World Ranking
4. Renders everything in reverse chronological order in a single embed with `Colors.Green`

**Editing Notes:**
- Only add entries for expansions not covered by the Raider.io API (currently expansions 4 and 5)
- The `result` field supports Discord markdown (e.g., `**CE**` for bold)
- Entries are displayed in the order they appear in the array

---

## schedule.json

**Purpose:** Raid schedule displayed in the guild info channel.

**Consumer:** `functions/guild-info/updateSchedule.js`

**Full Structure:**

```json
{
    "title": "Raid Schedule",
    "raidDays": ["Wednesday", "Sunday"],
    "raidTimes": ["20:00 - 23:00"],
    "timeZone": "Server Time (CEST +1)"
}
```

**Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Embed title (note: the emoji is added programmatically, not in the JSON) |
| `raidDays` | string[] | Array of day names. Joined with newlines for display |
| `raidTimes` | string[] | Array of time ranges. Repeated once per raid day in the embed |
| `timeZone` | string | Footer text describing the time zone |

**How it is rendered:**

The `updateSchedule` function creates an embed with:
- Title: from the JSON (with emoji prefix added)
- Color: `Colors.Green`
- Three inline fields:
  1. `Day` -- `raidDays` joined with `\n`
  2. Spacer field (`\u200b` name and value) for visual separation
  3. `Time` -- `raidTimes[0]` repeated for each raid day, joined with `\n`
- Footer: `timeZone` string

**Editing Notes:**
- To add a raid day, add an entry to `raidDays`. The time will be automatically repeated.
- If different days have different times, the current code does not support per-day times -- it repeats the first time entry for all days.

---

## recruitment.json

**Purpose:** Recruitment information displayed in the guild info channel, including a template token for overlord mentions.

**Consumer:** `functions/guild-info/updateRecruitment.js`

**Full Structure:**

```json
{
    "title": "Recruitment",
    "content": [
        {
            "title": "Who are we",
            "body": "A SeriouslyCasual player is one that knows the ins and outs of their class, can consistently perform up to a mythic raiding standard, and enjoys a relaxed social environment. If that sounds like you, then we'd love to hear from you!"
        },
        {
            "title": "What We Want From You",
            "body": "- Know everything there is to know about your class at any given time. This includes rotations, use of defensives, consumables, legendaries, specs, enchants, and the like.\n- Be proactive and prepared for every raid encounter. This means researching boss fights.\n- Be mature and friendly. Bonus points if you're funny.\n- Attend at least 90% of our scheduled raids within any given tier.\n- Be ready to receive criticism (where its warranted, of course)."
        },
        {
            "title": "What We Can Give You",
            "body": "- A stable mythic raiding guild with over 9 years of raiding at World of Warcraft's highest levels.\n- A platform where you can constantly learn and grow as a player.\n- A great social environment with an active Discord for WoW and even other gaming interests!\n- Memes. So many memes.\n\nIf you're an exceptional player and your class isn't listed, we still encourage you to apply. Exceptional players will always be considered regardless of class or spec."
        },
        {
            "title": "Need to know more? Contact these guys!",
            "body": "Contact {{OVERLORDS}} if you have any questions."
        }
    ]
}
```

**Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Embed title (emoji prefix added programmatically) |
| `content` | array | Array of section objects, displayed as embed fields |
| `content[].title` | string | Field name in the embed |
| `content[].body` | string | Field value. Supports Discord markdown and the `{{OVERLORDS}}` token |

**Template Token: `{{OVERLORDS}}`**

The string `{{OVERLORDS}}` in any `body` field is replaced at runtime with Discord user mentions for all users in the `overlords` Keyv namespace:

- Each overlord is formatted as `<@${userId}>`
- Multiple overlords are joined with ` / ` (space-slash-space)
- The message is sent with `allowedMentions: { users: [] }` to suppress ping notifications

**How it is rendered:**

The `updateRecruitment` function creates an embed with:
- Title: from the JSON
- Color: `Colors.Green`
- Fields: each `content` entry becomes a field, with spacer fields (`\u200b`) between them
- The last spacer is removed via `.pop()` before posting
- An ActionRow with a `ButtonStyle.Link` button labeled `'Apply Here'` with the URL from `config.json` `applicationChannelUrl`

**Editing Notes:**
- Add or remove sections by modifying the `content` array
- The `{{OVERLORDS}}` token can appear in any `body` field (currently used in the last section)
- Markdown list items use `\n-` for newlines within JSON strings
- Overlord data comes from the database, not this file

---

## raidersSeedData.json

**Purpose:** Initial seed data for the raiders database. Used when the bot starts for the first time or when a manual re-seed is triggered.

**Consumer:** `functions/raids/addRaiders.js` (when `useSeedData=true`)

**Format:** Array of `{ name, userId }` objects.

**Structure:**

```json
[
  { "name": "Agahhnes", "userId": "1178029243398099025" },
  { "name": "Aspectial", "userId": "137192055771365376" },
  { "name": "Barteos", "userId": "146905157685215233" },
  ...
]
```

**Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | WoW character name (may include special characters like accented letters) |
| `userId` | string | Discord user ID (numeric string), or `null` if not yet linked |

**Current entry count:** 23 raiders

**How it is used:**

The `addRaiders(override, useSeedData)` function:
1. Checks for the seeding marker key `'SeriouslyCasualRaidersSeeded'` in the `raiders` Keyv namespace
2. If not seeded (or `override=true`): clears the database and loads from `data/raidersSeedData.json` (if `useSeedData=true`) or from `data/${raiderJson}` (the auto-generated file)
3. Sets each entry as `raiders.set(name, userId)` in the Keyv namespace
4. Sets the marker `'SeriouslyCasualRaidersSeeded'` to `true`
5. Calls `updateRaiderJsonData()` to write the current state to `raiders.json`

**Editing Notes:**
- Edit this file to set the initial raider roster for a fresh deployment
- Character names must match the in-game names exactly (case-sensitive, including special characters)
- Discord user IDs can be obtained by enabling Developer Mode in Discord and right-clicking a user

---

## raiders.json

**Purpose:** Auto-generated backup of the current raiders database. Regenerated on every raider add, remove, or update operation.

**Consumer:** `functions/raids/addRaiders.js` (when `useSeedData=false`, which is the default on startup)

**Writer:** `functions/raids/updateRaiderJsonData.js`

**Format:** Same shape as `raidersSeedData.json` -- array of `{ name, userId }` objects. However, it also includes the seeding marker as an entry.

**Example Current Content:**

```json
[
  {
    "name": "SeriouslyCasualRaidersSeeded",
    "userId": true
  },
  {
    "name": "Skadimonk",
    "userId": "105035733558890496"
  },
  {
    "name": "Splocycle",
    "userId": null
  }
]
```

**Key Differences from raidersSeedData.json:**

1. **Includes the seeding marker:** The entry `{ "name": "SeriouslyCasualRaidersSeeded", "userId": true }` is the Keyv marker that tracks whether initial seeding has occurred. It is included because `updateRaiderJsonData()` iterates all keys in the `raiders` namespace, including this marker.

2. **`userId` can be `null`:** Raiders added by the sync process that have not been linked to a Discord user will have `userId: null`.

3. **`userId` can be `true`:** Only for the `SeriouslyCasualRaidersSeeded` marker entry.

4. **Content reflects live state:** This file is overwritten on every raider change. Its contents reflect whatever is currently in the `raiders` Keyv namespace.

**Generation Process:**

`updateRaiderJsonData()` in `functions/raids/updateRaiderJsonData.js`:
1. Iterates all entries in the `raiders` Keyv namespace
2. Builds an array of `{ name, userId }` objects
3. Writes to `data/${raiderJson}` (where `raiderJson` is from `config.json`, default: `"raiders.json"`)
4. Uses `JSON.stringify(array, null, 2)` for pretty-printing

**DO NOT EDIT THIS FILE MANUALLY.** It will be overwritten by the bot. To change the raider roster, use the `/raiders` slash commands or edit `raidersSeedData.json` for a fresh deployment.

---

## signupAlertMessages.json

**Purpose:** Pool of randomized messages used when alerting raiders who have not signed up for upcoming raids.

**Consumer:** `functions/raids/alertSignups.js`

**Full Structure:**

```json
{
    "messages": [
        "Shame... ring Shame... ring Shame... ring",
        "Oi, sign up innit?",
        "Dear Sir/Madam, please sign up for the next raid.",
        "Congratulations! You have won a chance to raid - Sign up here:",
        "Did you know that if you don't sign up for a raid, there's 99% chance you are left out of the roster.",
        "Have you considered signing up on time?",
        "Don't make Warz angry, you don't like when he's angry...",
        "Don't leave our raid team hanging! Sign up and let's conquer together! \n*[Quip generated by OpenAI]*",
        ...
    ]
}
```

**Field Reference:**

| Field | Type | Description |
|-------|------|-------------|
| `messages` | string[] | Array of alert message strings. One is selected at random for each alert |

**Message Count:** 57 messages total

**Message Categories:**

| Range | Count | Style | Attribution |
|-------|-------|-------|-------------|
| Messages 1-7 | 7 | Hand-written, guild-specific humor | None |
| Messages 8-17 | 10 | Generic raid encouragement | `*[Quip generated by OpenAI]*` |
| Messages 18-37 | 20 | Gaming humor with raid metaphors | `*[Quip generated by OpenAI]*` |
| Messages 38-57 | 20 | Guild-personalized (references Bing and Warzania) | `*[Quip generated by OpenAI]*` |

**How it is used:**

The `alertSignups` function:
1. Selects a random message: `messages[Math.floor(Math.random() * messages.length)]`
2. Prepends the random message to the alert content
3. Appends a list of unsigned raider mentions and links to the signup page
4. For 48-hour reminders: includes a Discord relative timestamp (`<t:${timer}:R>`)
5. Posts to the `raidersLoungeChannelId` channel

**Editing Notes:**
- Add new messages by appending to the `messages` array
- Messages can contain Discord markdown, emojis, and `\n` for newlines
- All messages have equal probability of selection
- Messages referencing "Bing" and "Warzania" are guild-specific personality references

---

## Editing Guide

### Safe to Edit (Static Files)

These files are read-only from the bot's perspective. The bot never writes to them. Changes take effect on the next relevant operation (e.g., next `/guildinfo` command for guild info files, next signup alert for messages).

| File | When Changes Take Effect |
|------|-------------------------|
| `aboutus.json` | Next `/guildinfo` command execution |
| `achievements.json` | Next `/guildinfo` or `/updateachievements` command, or next 30-minute auto-update |
| `schedule.json` | Next `/guildinfo` command execution |
| `recruitment.json` | Next `/guildinfo` command execution |
| `raidersSeedData.json` | Next fresh deployment with manual re-seed, or `addRaiders(true, true)` call |
| `signupAlertMessages.json` | Next signup alert (random selection from updated pool) |

### Auto-Generated (Do Not Edit)

| File | Writer | Trigger |
|------|--------|---------|
| `raiders.json` | `updateRaiderJsonData()` | Every raider add, remove, update, or sync operation |

Manual edits to `raiders.json` will be overwritten the next time any raider operation occurs. To modify the raider roster, use the `/raiders` slash commands.

### Deployment Considerations

All data files in `data/` are included in the SFTP deployment (the deploy workflow uploads `./*`). This means:

- Edits to static files must be committed to the repository and deployed to take effect on the production server
- The production `raiders.json` will be **overwritten** by whatever version is in the repository during deployment. However, the bot will regenerate it from the database on the next raider operation
- The production `raidersSeedData.json` is only used on first boot (when the seeding marker is absent) or manual re-seed. Deploying an updated seed file will not automatically re-seed the database
