# Data Files

Static and generated JSON data files in `data/`. Used for guild info embeds, raider seeding/backup, and signup alert messages.

## Files

### `aboutus.json` — Guild Info: About Us

Static content for the About Us embed in the guild info channel.

**Consumer:** `functions/guild-info/updateAboutUs.js`

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Embed title with Alliance emoji ID |
| `content` | string | Guild description (markdown) |
| `wowProgrsesIcon` | string | Discord emoji ID for WoW Progress link button |
| `wowProgressUrl` | string | WoW Progress guild URL |
| `raiderioIcon` | string | Discord emoji ID for Raider.io link button |
| `raiderioUrl` | string | Raider.io guild URL |
| `warcraftLogsIcon` | string | Discord emoji ID for WarcraftLogs link button |
| `warcraftLogsUrl` | string | WarcraftLogs guild URL (guild ID 486913) |

**Note:** Field `wowProgrsesIcon` has a typo ("Progrses" instead of "Progress"). This is in the data, not the code.

---

### `schedule.json` — Guild Info: Raid Schedule

Static content for the Raid Schedule embed.

**Consumer:** `functions/guild-info/updateSchedule.js`

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Embed title with calendar emoji |
| `raidDays` | string[] | `["Wednesday", "Sunday"]` |
| `raidTimes` | string[] | `["20:00 - 23:00"]` |
| `timeZone` | string | `"Server Time (CEST +1)"` |

---

### `recruitment.json` — Guild Info: Recruitment

Static content for the Recruitment embed. Contains multiple sections.

**Consumer:** `functions/guild-info/updateRecruitment.js`

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Embed title with memo emoji |
| `content` | array | Array of `{ title, body }` section objects |

**Sections:**
1. "Who are we" — Description of a SeriouslyCasual player
2. "What We Want From You" — Requirements (class knowledge, preparation, attendance 90%+, etc.)
3. "What We Can Give You" — Guild selling points
4. "Need to know more? Contact these guys!" — Contains `{{OVERLORDS}}` template placeholder

The `{{OVERLORDS}}` placeholder is replaced at runtime with mentions of all users in the `overlords` Keyv namespace.

---

### `achievements.json` — Guild Info: Historical Achievements

Static content for legacy raid achievements (expansions 4-5). Achievements for expansion 6+ are fetched dynamically from Raider.io.

**Consumer:** `functions/guild-info/updateAchievements.js`

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Embed title with trophy emoji |
| `achievements` | array | Array of achievement objects |

**Achievement object shape:**

| Field | Type | Description |
|-------|------|-------------|
| `raid` | string | Raid name (e.g. "Hellfire Citadel") |
| `progress` | string | Boss kill progress (e.g. "13/13M") |
| `result` | string | Result text, **CE** bolded if Cutting Edge achieved, plus world rank |
| `expansion` | number | Expansion ID (4 = MoP, 5 = WoD) |

**Current entries:** 4 achievements from expansions 4-5 (MoP and WoD era).

---

### `raidersSeedData.json` — Raider Seed Data (Static Fallback)

Hardcoded initial roster used to seed the `raiders` Keyv namespace on first boot or when the dynamic data file is unavailable.

**Consumer:** `functions/raids/addRaiders.js`

**Shape:** Array of `{ name: string, userId: string }` objects.
- `name` — Character name (e.g. "Aspectial")
- `userId` — Discord user ID string (e.g. "137192055771365376")

Contains 23 raiders. Used as fallback when `raiders.json` (the dynamic file) cannot be loaded.

---

### `raiders.json` — Raider Data (Auto-Generated)

**This file is auto-generated and should not be manually edited.** It is a JSON backup of the `raiders` Keyv namespace, written to disk whenever the raider data changes.

**Writer:** `functions/raids/updateRaiderJsonData.js`
**Reader:** `functions/raids/addRaiders.js` (on startup, as primary data source)

**Shape:** Same as `raidersSeedData.json` — array of `{ name: string, userId: string | null }` objects.

**Generation triggers:** Called by `addRaider.js`, `removeRaider.js`, `updateRaider.js`, `updateRaiderDiscordUser.js`, and `addRaiders.js` after any roster mutation. Iterates all entries in the `raiders` Keyv namespace and writes the full array to disk.

**Config dependency:** The filename is configurable via `raiderJson` in `config.json` (default: `"raiders.json"`).

**Startup flow:**
1. `addRaiders()` checks for `SeriouslyCasualRaidersSeeded` marker in DB
2. If not seeded: tries to load `data/{raiderJson}` (the dynamic file)
3. If that fails: falls back to `raidersSeedData.json` (the static seed)
4. Seeds all entries into `raiders` Keyv namespace
5. Calls `updateRaiderJsonData()` to write back to disk

The first entry in the file is always `{ "name": "SeriouslyCasualRaidersSeeded", "userId": true }` — this is the seeding marker stored in the same namespace.

---

### `signupAlertMessages.json` — Signup Alert Quips

Collection of humorous messages appended to raid signup reminder alerts. A random message is selected each time an alert fires.

**Consumer:** `functions/raids/alertSignups.js`

**Shape:** `{ messages: string[] }`

Contains 60 messages in three tiers:
1. **Original messages** (7) — Hand-written guild humour
2. **Generic OpenAI quips** (10) — Generated, marked with `[Quip generated by OpenAI]`
3. **Themed OpenAI quips** (23) — Generated with humour/meme tone
4. **Personalized OpenAI quips** (20) — Reference guild members "Bing" and "Warzania"

**Usage:** `signupAlertMessages.messages[randomIndex]` is appended to the signup alert message posted in the raiders lounge channel.

---

## Consumer Map

| File | Consumer(s) | Read/Write |
|------|------------|------------|
| `aboutus.json` | `functions/guild-info/updateAboutUs.js` | Read |
| `schedule.json` | `functions/guild-info/updateSchedule.js` | Read |
| `recruitment.json` | `functions/guild-info/updateRecruitment.js` | Read |
| `achievements.json` | `functions/guild-info/updateAchievements.js` | Read |
| `raidersSeedData.json` | `functions/raids/addRaiders.js` | Read |
| `raiders.json` | `functions/raids/addRaiders.js` (read), `functions/raids/updateRaiderJsonData.js` (write) | Read/Write |
| `signupAlertMessages.json` | `functions/raids/alertSignups.js` | Read |

## Static vs Dynamic

| Category | Files | Editable |
|----------|-------|----------|
| Static (manual edit) | `aboutus.json`, `schedule.json`, `recruitment.json`, `achievements.json`, `raidersSeedData.json`, `signupAlertMessages.json` | Yes |
| Auto-generated | `raiders.json` | No — overwritten by bot |
