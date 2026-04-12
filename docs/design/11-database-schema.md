# 11 - Database Schema

This document specifies every Keyv namespace used by SeriouslyCasualBot, including exact key/value shapes, which functions write and read each namespace, and lifecycle details. This is the single source of truth for all persistent state.

---

## Technology

- **Storage engine:** SQLite via file `db.sqlite` in the project root
- **Abstraction:** Keyv ^4.3.3 with @keyv/sqlite ^3.5.3
- **Connection string:** `sqlite://./db.sqlite` (configured as `databaseString` in `config.json`)
- **Namespace isolation:** Each namespace is stored in the same SQLite file but isolated by Keyv's internal prefixing
- **Serialization:** Keyv serializes values to JSON internally

### Instance Pattern

Every file that accesses the database creates its own Keyv instance at module scope. There is no shared database module:

```javascript
const { databaseString } = require('../../config.json');
const Keyv = require('keyv');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', err => console.error('Keyv connection error:', err));
```

Multiple files may create instances for the same namespace. SQLite handles concurrent access.

### Operations Used

| Operation | Keyv Method | Description |
|-----------|-------------|-------------|
| Read one | `await keyv.get(key)` | Returns deserialized value or `undefined` |
| Write one | `await keyv.set(key, value)` | Upserts key-value pair |
| Delete one | `await keyv.delete(key)` | Removes single entry |
| Delete all | `await keyv.clear()` | Removes all entries in the namespace |
| Iterate | `for await (const [key, value] of keyv.iterator())` | Async iteration over all entries |

---

## Namespace Specifications

### 1. `raiders`

Stores the mapping of character names to Discord user IDs for all tracked guild raiders.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Character name (case-sensitive, e.g., `"Thrall"`) |
| **Value** | `string \| null` | Discord user ID (snowflake string) or `null` if not yet linked |

**Special marker key:** `'SeriouslyCasualRaidersSeeded'` with value `true` (boolean). Used to track whether the initial seeding from JSON has occurred. The `addRaider()` function rejects writes with this exact key name.

**Writers:**

| Function | File | Operation | Notes |
|----------|------|-----------|-------|
| `addRaider` | `functions/raids/addRaider.js` | `set(name, userId)` | Guards against key `'SeriouslyCasualRaidersSeeded'` |
| `addRaiders` | `functions/raids/addRaiders.js` | `clear()` then `set(name, userId)` per raider, then `set(seededKey, true)` | Bulk seeding on startup |
| `syncRaiders` | `functions/raids/syncRaiders.js` | Calls `addRaider(name, null)` and `removeRaider(name)` | Periodic roster sync |
| `updateRaiderDiscordUser` | `functions/raids/updateRaiderDiscordUser.js` | `set(name, userId)` | Links Discord user to character |
| `removeRaider` | `functions/raids/removeRaider.js` | `delete(name)` | Also calls `updateRaiderJsonData()` |
| `ignoreCharacter` | `functions/raids/ignoreCharacter.js` | Calls `removeRaider(name)` | Removes before adding to ignored |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `getRaiders` | `functions/raids/getRaiders.js` | `iterator()` -- formats as string with name, userId, realm |
| `getStoredRaiders` | `functions/raids/getStoredRaiders.js` | `iterator()` -- returns array of `{ name, value }` |
| `alertSignups` | `functions/raids/alertSignups.js` | `get(name)` -- resolves character to Discord ID for mentions |
| `updateLootPost` | `functions/loot/updateLootPost.js` | `iterator()` -- resolves userId to character name |
| `alertHighestMythicPlusDone` | `functions/raids/alertHighestMythicPlusDone.js` | `iterator()` -- iterates all raiders for M+ report |
| `sendAlertForRaidersWithNoUser` | `functions/raids/sendAlertForRaidersWithNoUser.js` | Receives data from caller |
| `getRaiders` (interactionCreate) | `events/interactionCreate.js` | `iterator()` -- local function, validates loot button clicks |

**Lifecycle:**
1. On first startup, `addRaiders(false, false)` seeds from `data/raiders.json` (or `data/raidersSeedData.json` as fallback)
2. Sets marker key `'SeriouslyCasualRaidersSeeded'` to `true`
3. Every 10 minutes, `syncRaiders` adds/removes to match Raider.io guild roster
4. Manual updates via `/raiders update_raider_user` command
5. On each add/remove, `updateRaiderJsonData()` writes backup to `data/raiders.json`

---

### 2. `raidersRealms`

Stores the realm (server) for each character, used for Raider.io M+ lookups.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Character name (matches key in `raiders` namespace) |
| **Value** | `string` | Realm name (e.g., `"silvermoon"`, `"tarren-mill"`) |

**Writers:**

| Function | File | Operation |
|----------|------|-----------|
| `addRaiderRealm` | `functions/raids/addRaiderRealm.js` | `set(name, realm)` |
| `syncRaiders` | `functions/raids/syncRaiders.js` | Calls `addRaiderRealm` and `removeRaiderRealm` |
| `removeRaiderRealm` | `functions/raids/removeRaiderRealm.js` | `delete(name)` |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `getRaiders` | `functions/raids/getRaiders.js` | `get(name)` per raider |
| `getStoredRaiderRealms` | `functions/raids/getStoredRaiderRealms.js` | `iterator()` -- returns array of `{ name, value }` |
| `alertHighestMythicPlusDone` | `functions/raids/alertHighestMythicPlusDone.js` | `get(name)` -- gets realm for Raider.io M+ API call |

**Lifecycle:** Created and removed in sync with `raiders` namespace by `syncRaiders`.

---

### 3. `overlords`

Stores guild officers/leaders who should be added to all application and trial review threads.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Officer name (display name, e.g., `"Ryan"`) |
| **Value** | `string` | Discord user ID (snowflake string) |

**Writers:**

| Function | File | Operation |
|----------|------|-----------|
| `addOverlord` | `functions/raids/addOverlord.js` | `set(name, userId)` |
| `removeOverlord` | `functions/raids/removeOverlord.js` | `delete(name)` |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `getOverlords` | `functions/raids/getOverlords.js` | `iterator()` -- returns formatted string `"name (userId)\n"` |
| `addOverlordsToThread` | `functions/addOverlordsToThread.js` | `iterator()` -- adds each userId to thread |
| `updateRecruitment` | `functions/guild-info/updateRecruitment.js` | `iterator()` -- builds `<@userId>` mention strings |

**Lifecycle:** Managed manually via `/raiders add_overlord` and `/raiders remove_overlord` commands. Read by `addOverlordsToThread` whenever a new application or trial review thread is created. Read by `updateRecruitment` to populate the `{{OVERLORDS}}` token in the recruitment embed.

---

### 4. `ignoredCharacters`

Characters excluded from roster sync. When a character is ignored, it is removed from `raiders` and will not be re-added by sync.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Character name |
| **Value** | `undefined` | Set with no value (`keyv.set(name)` -- Keyv stores `undefined`) |

**Writers:**

| Function | File | Operation |
|----------|------|-----------|
| `ignoreCharacter` | `functions/raids/ignoreCharacter.js` | `set(name)` (after calling `removeRaider(name)`) |
| `removeIgnoredCharacter` | `functions/raids/ignoreCharacter.js` | `delete(name)` |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `getIgnoredCharacters` | `functions/raids/ignoreCharacter.js` | `iterator()` -- returns formatted string |
| `getStoredIgnoredCharacters` | `functions/raids/ignoreCharacter.js` | `iterator()` -- returns array of names |
| `syncRaiders` | `functions/raids/syncRaiders.js` | Calls `getStoredIgnoredCharacters()` to filter roster |

**Lifecycle:** Created via the `ignore_missing_character` button in bot-setup channel or `/raiders ignore_character` command. Removed via `/raiders remove_ignore_character`. During `syncRaiders`, ignored characters are filtered out of the guild roster and any stored raiders matching ignored names are queued for removal.

---

### 5. `trials`

Stores active trial (probation period) data for new guild members.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Discord thread ID (snowflake string) of the trial review thread |
| **Value** | `object` | Trial data object (see below) |

**Value shape:**

```javascript
{
  characterName: string,     // e.g., "Thrall"
  role: string,              // e.g., "DPS", "Tank", "Healer"
  startDate: string,         // ISO date string or Date object (e.g., "2024-01-15")
  extended: number,          // Count of 1-week extensions (0 or undefined initially)
  trialReviewId: string,     // Discord message ID of the review embed in the channel
  trialLogsId: string        // Discord message ID of the pinned logs message in the thread
}
```

**Writers:**

| Function | File | Operation | Notes |
|----------|------|-----------|-------|
| `createTrialReviewThread` | `functions/trial-review/createTrialReviewThread.js` | `set(threadId, trial)` via `changeTrialInfo` | Initial creation |
| `changeTrialInfo` | `functions/trial-review/changeTrialInfo.js` | `set(threadId, trial)` | Merges with existing using nullish coalescing (`??`) |
| `extendTrial` | `functions/trial-review/extendTrial.js` | `set(threadId, trial)` | Increments `extended` field |
| `removeTrial` | `functions/trial-review/removeTrial.js` | `delete(threadId)` | Also deletes from `trialAlerts` |
| `markToPromote` | `functions/trial-review/markToPromote.js` | `set(threadId, trial)` | Re-saves existing trial (no-op write) |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `getCurrentTrials` | `functions/trial-review/getCurrentTrials.js` | `iterator()` -- returns JSON of all trials |
| `checkForReviewAlerts` | `functions/trial-review/checkForReviewAlerts.js` | `iterator()` -- checks alerts for each trial |
| `keepTrialThreadsAlive` | `functions/trial-review/keepTrialThreadsAlive.js` | `iterator()` -- unarchives trial threads |
| `keepTrialThreadAlive` | `functions/trial-review/keepTrialThreadAlive.js` | `get(threadId)` -- single thread check |
| `updateTrialLogs` | `functions/trial-review/updateTrialLogs.js` | `iterator()` -- refreshes WarcraftLogs for all |
| `updateTrailReviewMessages` | `functions/trial-review/updateTrailReviewMessages.js` | `iterator()` -- regenerates review embeds |
| `updateTrialLogsContent` | `functions/trial-review/updateTrialLogsContent.js` | `get(threadId)` -- updates logs for one trial |
| `trialInfoModal` | `functions/trial-review/trialInfoModal.js` | `get(threadId)` -- pre-fills modal with current data |
| `getTrialLogs` | `functions/trial-review/getTrialLogs.js` | `get(threadId)` -- gets character name for WarcraftLogs query |
| `markToPromote` | `functions/trial-review/markToPromote.js` | `get(threadId)` -- reads trial before promotion |

**Lifecycle:**
1. Created when an application is accepted (via `addNewTrialInfoModal` submission)
2. Updated when trial info is changed via `updateTrialInfoModal`
3. Extended via `extendTrialByOneWeek` button (increments `extended` counter)
4. Deleted when `closeTrial` button is clicked

---

### 6. `trialAlerts`

Stores alert schedules for trial review dates.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Discord thread ID (matches key in `trials` namespace) |
| **Value** | `array` | Array of alert objects (see below) |

**Value shape (array element):**

```javascript
{
  name: string,      // e.g., "First Review", "Final Review", "Extended Review (0)"
  date: Date,        // JavaScript Date object (serialized as ISO string by Keyv)
  alerted: boolean   // true if the alert has already been sent
}
```

A typical entry has 2 alerts (First Review + Final Review). Each extension adds one more alert entry.

**Writers:**

| Function | File | Operation | Notes |
|----------|------|-----------|-------|
| `checkForReviewAlerts` | `functions/trial-review/checkForReviewAlerts.js` | `set(threadId, alerts)` | Creates from `generateTrialAlert()` if missing; marks alerts as `alerted: true` |
| `updateTrialAlerts` | `functions/trial-review/updateTrialAlerts.js` | `set(threadId, alerts)` | Regenerates alerts after trial info changes |
| `extendTrial` | `functions/trial-review/extendTrial.js` | `set(threadId, alerts)` | Regenerates with new extension date |
| `removeTrial` | `functions/trial-review/removeTrial.js` | `delete(threadId)` | Cleanup on trial close |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `checkForReviewAlerts` | `functions/trial-review/checkForReviewAlerts.js` | `get(threadId)` -- checks each alert date |

**Alert generation logic (`generateTrialAlert`):**
1. Calculates `firstReviewDate` = startDate + 14 days (at 22:00)
2. Calculates `finalReviewDate` = startDate + 28 days (at 22:00)
3. For each extension index 0..extended-1: `finalReviewDate + (index+1) * 7 days`
4. Each alert starts with `alerted: false`, unless the date has already passed (`new Date(date) < new Date()`)

**Lifecycle:** Created lazily by `checkForReviewAlerts` if not found for a trial. Regenerated on trial info changes and extensions. Deleted when trial is closed.

---

### 7. `promoteAlerts`

Stores scheduled promotion reminders for trials marked for promotion.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Discord thread ID (matches key in `trials` namespace) |
| **Value** | `Date` | JavaScript Date object for the next raid day at 17:30 |

**Writers:**

| Function | File | Operation | Notes |
|----------|------|-----------|-------|
| `markToPromote` | `functions/trial-review/markToPromote.js` | `set(threadId, nextRaidDay)` | Calculates next Sunday or Wednesday (whichever sooner) at 17:30 |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `alertPromotions` | `functions/trial-review/alertPromotions.js` | `iterator()` then `delete(threadId)` after alert |

**Promotion date calculation (`markToPromote`):**
```
nextDay(x): now.setDate(now.getDate() + (x + (7 - now.getDay())) % 7)
nextSunday = nextDay(0)
nextWednesday = nextDay(3)
nextRaidDay = min(nextSunday, nextWednesday)
nextRaidDay.setHours(17, 30)
```

**Lifecycle:** Created when the "Mark for Promotion" button is clicked. Once the date passes, `alertPromotions` sends `"<@&${adminRoleId}> Promotion time!"` to the trial thread and deletes the entry. The deletion happens in a separate loop after iteration to avoid modifying the collection during iteration.

---

### 8. `openApplications`

Maps application channels to their viewer thread IDs, tracking which applications have been processed.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Discord channel ID of the application channel (in the applications category) |
| **Value** | `string` | Discord thread ID of the corresponding discussion thread in the viewer channel |

**Writers:**

| Function | File | Operation | Notes |
|----------|------|-----------|-------|
| `copyApplicationToViewer` | `functions/applications/copyApplicationToViewer.js` | `set(channelId, threadId)` | After creating the viewer thread |
| `checkApplications` | `functions/applications/checkApplications.js` | `clear()` | Clears all when application category is empty |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `checkApplications` | `functions/applications/checkApplications.js` | `get(channelId)` -- checks if application already tracked |
| `copyApplicationToViewer` | `functions/applications/copyApplicationToViewer.js` | `get(channelId)` -- double-check before processing |

**Lifecycle:** An entry is created when a new application is detected and copied to the viewer channel. The entire namespace is cleared when the application category has no child channels (all applications resolved).

---

### 9. `openApplicationThreads`

Tracks active application discussion threads for the keep-alive mechanism.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Discord thread ID of the application discussion thread |
| **Value** | `undefined` | Set with no explicit value (`keyv.set(threadId)`) |

**Writers:**

| Function | File | Operation |
|----------|------|-----------|
| `copyApplicationToViewer` | `functions/applications/copyApplicationToViewer.js` | `set(threadId)` |
| `keepApplicationThreadsAlive` | `functions/applications/keepApplicationThreadsAlive.js` | `delete(threadId)` (if thread not found) |
| `archiveApplicationThread` | `functions/applications/archiveApplicationThread.js` | `delete(threadId)` |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `keepApplicationThreadsAlive` | `functions/applications/keepApplicationThreadsAlive.js` | `iterator()` -- iterates all tracked threads |
| `keepApplicationThreadAlive` | `functions/applications/keepApplicationThreadAlive.js` | `get(threadId)` -- checks single thread |

**Lifecycle:** Entry created when application is copied to viewer. The keep-alive task (every 3 minutes) iterates all entries: if a thread is archived, it unarchives it and pings admins; if a thread is not found (deleted), the entry is removed. Entry is deleted when application is archived (accepted/rejected).

---

### 10. `applicationVotes`

Stores voting data for application discussions.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Discord thread ID of the application discussion thread |
| **Value** | `object` | Voting data (see below) |

**Value shape:**

```javascript
{
  messageId: string,          // Discord message ID of the voting embed
  forVotes: [string],         // Array of Discord user IDs who voted "for"
  neutralVotes: [string],     // Array of Discord user IDs who voted "neutral"
  againstVotes: [string],     // Array of Discord user IDs who voted "against"
  kekNo: [string]             // Array of Discord user IDs who used the "KekW Against" vote
}
```

**Writers:**

| Function | File | Operation | Notes |
|----------|------|-----------|-------|
| `createVotingThreadMessage` | `functions/applications/createVotingThreadMessage.js` | `set(threadId, initialVotes)` | Initializes with empty arrays |
| `voteForApplicant` | `functions/applications/voteApplicant.js` | `get` then `set` | Removes from previous vote, adds to `forVotes` |
| `voteNeutralApplicant` | `functions/applications/voteApplicant.js` | `get` then `set` | Removes from previous vote, adds to `neutralVotes` |
| `voteAgainstApplicant` | `functions/applications/voteApplicant.js` | `get` then `set` | Removes from previous vote, adds to `againstVotes` |
| `voteKekwAgainstApplicant` | `functions/applications/voteApplicant.js` | `get` then `set` (twice) | Calls `voteAgainstApplicant` first, then adds to `kekNo` |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `generateVotingMessage` | `functions/applications/generateVotingMessage.js` | `get(threadId)` -- builds voting embed |

**Vote deduplication logic:**
1. `checkIfAlreadyVoted(userId, votes)` returns: 1 = for, 2 = neutral, 3 = against, 0 = not voted
2. `removeVoter(alreadyVoted, userId, votes)` removes user from their previous vote category
3. When removing from "against" (case 3), also removes from `kekNo` array (uses loose equality `!=`)
4. The new vote is then pushed to the appropriate array
5. `kekNo` is initialized to `[]` if not present (defensive check for legacy data)

---

### 11. `lootResponses`

Stores loot priority sign-up data per boss encounter.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Boss encounter ID from Raider.io (e.g., `"12345"`) |
| **Value** | `object` | Loot response data (see below) |

**Value shape:**

```javascript
{
  major: [string],      // Array of Discord user IDs who selected "Major"
  minor: [string],      // Array of Discord user IDs who selected "Minor"
  wantIn: [string],     // Array of Discord user IDs who selected "Want In"
  wantOut: [string],    // Array of Discord user IDs who selected "Do not need"
  channelId: string,    // Discord channel ID where the loot post was sent
  messageId: string,    // Discord message ID of the loot post
  bossName: string,     // Boss name (e.g., "Kazzara")
  bossUrl: string       // WoWHead URL (e.g., "https://www.wowhead.com/npc=12345")
}
```

**Writers:**

| Function | File | Operation | Notes |
|----------|------|-----------|-------|
| `addLootPost` | `functions/loot/addLootPost.js` | `set(bossId, response)` | Initializes with empty arrays |
| `updateLootResponse` | `functions/loot/updateLootResponse.js` | `get` then `set` | Removes user from all arrays, adds to selected |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `updateLootPost` | `functions/loot/updateLootPost.js` | `get(bossId)` -- rebuilds embed with names |
| `deleteLootPost` | `functions/loot/deleteLootPost.js` | `get(bossId)` then `delete(bossId)` -- deletes Discord message and DB entry |

**Response update logic (`updateLootResponse`):**
1. Fetches current responses for boss
2. `removeFromAllLootResponses`: filters userId out of all 4 arrays (major, minor, wantIn, wantOut)
3. Pushes userId into the selected response array
4. Saves updated responses
5. Calls `updateLootPost` to refresh the Discord message

**Name resolution:** `updateLootPost` iterates the `raiders` namespace to resolve Discord user IDs to character names for display in the embed.

---

### 12. `guildinfo`

Stores Discord message IDs for guild info embeds, allowing updates to existing messages rather than creating new ones.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Identifier string |
| **Value** | `string` | Discord message ID (snowflake string) |

**Known keys:**

| Key | Purpose |
|-----|---------|
| `'achievementsPostId'` | Message ID of the achievements embed in the guild info channel |

**Writers:**

| Function | File | Operation |
|----------|------|-----------|
| `updateAchievements` | `functions/guild-info/updateAchievements.js` | `set('achievementsPostId', messageId)` |
| `clearGuildInfo` | `functions/guild-info/clearGuildInfo.js` | `clear()` -- removes all entries |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `updateAchievements` | `functions/guild-info/updateAchievements.js` | `get('achievementsPostId')` -- edits existing message if found |

**Lifecycle:** When `/guildinfo` runs a full refresh, `clearGuildInfo` deletes all messages in the channel and clears this namespace. Each embed function then posts fresh messages. `updateAchievements` stores the message ID so the scheduled task (every 30 minutes) can edit the existing message rather than posting a new one.

---

### 13. `settings`

Stores feature toggle flags for signup alert controls.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Setting name (from the `settings` object in `functions/settings/settings.js`) |
| **Value** | `boolean` | `true` (enabled) or `false` (disabled) |

**Known keys:**

| Key | Controls | Consumed On |
|-----|----------|-------------|
| `'alertSignup_Wednesday'` | 24-hour signup reminder for Wednesday raid | Tuesday (day 2) at 19:00 |
| `'alertSignup_Wednesday_48'` | 48-hour signup reminder for Wednesday raid | Monday (day 1) at 19:00 |
| `'alertSignup_Sunday'` | 24-hour signup reminder for Sunday raid | Saturday (day 6) at 19:00 |
| `'alertSignup_Sunday_48'` | 48-hour signup reminder for Sunday raid | Friday (day 5) at 19:00 |

**Writers:**

| Function | File | Operation |
|----------|------|-----------|
| `setSetting` | `functions/settings/setSetting.js` | `set(setting, newValue)` |

**Readers:**

| Function | File | Operation |
|----------|------|-----------|
| `getSettings` | `functions/settings/getSettings.js` | `get(setting) ?? false` -- defaults to `false` if unset |
| `getAllSettings` | `functions/settings/getAllSettings.js` | `iterator()` -- returns all settings as formatted string |

**Lifecycle:** Managed via `/settings toggle_setting` and `/settings get_setting` commands. The `alertSignups` function checks the relevant setting before sending each signup alert; if the setting is `false` or unset, the alert is skipped.

---

### 14. `priorityLootPostConfig`

Stores Discord message IDs for the three-part EPGP priority ranking display.

| Field | Type | Description |
|-------|------|-------------|
| **Key** | `string` | Internal identifier with underscore prefix |
| **Value** | `string` | Discord message ID (snowflake string) |

**Known keys:**

| Key | Purpose |
|-----|---------|
| `'_messageHeaderId'` | Message ID of the header (column names: Name, EP, GP, PR) |
| `'_messageId'` | Message ID of the body (raider data rows) |
| `'_messageFooterId'` | Message ID of the footer (timestamps) |

**Writers:**

| Function | File | Operation |
|----------|------|-----------|
| `createPriorityRankingPost` | `functions/epgp/priorityRankingPost.js` | `set('_messageHeaderId', id)`, `set('_messageId', id)`, `set('_messageFooterId', id)` |

**Readers:**

| Function | File | Operation | Notes |
|----------|------|-----------|-------|
| `updatePriorityRankingPost` | `functions/epgp/priorityRankingPost.js` | `get('_messageId')`, `get('_messageFooterId')` | **Bug:** Line 43 fetches `_messageFooterId` but stores in variable named `messageHeaderId` |

**Known bug:** In `updatePriorityRankingPost`, line 43 reads:
```javascript
const messageHeaderId = await priorityLootPostConfig.get(messageFooterIdKey);
```
This fetches the footer key but assigns it to a variable named `messageHeaderId`. The header message is never updated during auto-refresh -- only the body (data rows) and footer (timestamps) are updated. This is functionally correct because the header (column names) never changes, but the variable naming is misleading.

**Lifecycle:** Created via `/loot update_priority_post` with `create_post: true`. Updated every 10 minutes by the `updatePriorityRankingPost` cron job. The header is only written once; body and footer are refreshed with current EPGP data.

---

## Cross-Namespace Relationship Diagram

```
                    Character Name (shared key)
              +----------------------------------+
              |                                  |
    +---------+----------+             +---------+----------+
    |     raiders        |             |   raidersRealms    |
    |  key: charName     |             |  key: charName     |
    |  val: userId|null  |             |  val: realmName    |
    +---------+----------+             +--------------------+
              |
              | userId lookup
              v
    +--------------------+
    |   lootResponses    |
    |  (resolves userId  |
    |   to charName)     |
    +--------------------+


    +---------+----------+
    | ignoredCharacters  |
    |  key: charName     |--- filters ---> syncRaiders ---> raiders
    |  val: undefined    |
    +--------------------+


              Thread ID (shared key)
    +---------+----------+
    |      trials        |
    |  key: threadId     |
    |  val: {trial data} |
    +---------+----------+
              |
              +----------------------------------+
              |                                  |
    +---------+----------+             +---------+----------+
    |    trialAlerts     |             |   promoteAlerts    |
    |  key: threadId     |             |  key: threadId     |
    |  val: [{alert}]    |             |  val: Date         |
    +--------------------+             +--------------------+


              Thread ID (shared key)
    +---------+-----------+
    |  openApplications   |
    |  key: channelId     +--- val: threadId ---+
    +---------------------+                     |
                                                v
    +---------+-----------+            +--------+-----------+
    |openApplicationThreads|            | applicationVotes  |
    |  key: threadId       |            |  key: threadId    |
    |  val: undefined      |            |  val: {votes}     |
    +----------------------+            +-------------------+


    +--------------------+             +----------------------+
    |     overlords      |             |      guildinfo       |
    |  key: name         |             |  key: identifier     |
    |  val: userId       |             |  val: messageId      |
    +--------------------+             +----------------------+

    +--------------------+             +----------------------+
    |     settings       |             | priorityLootPostConfig|
    |  key: settingName  |             |  key: _identifier    |
    |  val: boolean      |             |  val: messageId      |
    +--------------------+             +----------------------+
```

---

## Domain Read/Write Matrix

Legend: **W** = Write, **R** = Read, **RW** = Read and Write, **C** = Clear

| Namespace | Applications | Trial Review | Raids | Loot | EPGP | Guild Info | Settings | Shared (interactionCreate) |
|-----------|-------------|-------------|-------|------|------|-----------|----------|---------------------------|
| `raiders` | -- | -- | **RW** | R | -- | -- | -- | R |
| `raidersRealms` | -- | -- | **RW** | -- | -- | -- | -- | -- |
| `overlords` | R | R | **RW** | -- | -- | R | -- | -- |
| `ignoredCharacters` | -- | -- | **RW** | -- | -- | -- | -- | W |
| `trials` | -- | **RW** | -- | -- | -- | -- | -- | -- |
| `trialAlerts` | -- | **RW** | -- | -- | -- | -- | -- | -- |
| `promoteAlerts` | -- | **RW** | -- | -- | -- | -- | -- | -- |
| `openApplications` | **RW** | -- | -- | -- | -- | -- | -- | -- |
| `openApplicationThreads` | **RW** | -- | -- | -- | -- | -- | -- | -- |
| `applicationVotes` | **RW** | -- | -- | -- | -- | -- | -- | -- |
| `lootResponses` | -- | -- | -- | **RW** | -- | -- | -- | -- |
| `guildinfo` | -- | -- | -- | -- | -- | **RW** (W+C) | -- | -- |
| `settings` | -- | -- | -- | -- | -- | -- | **RW** | -- |
| `priorityLootPostConfig` | -- | -- | -- | -- | **RW** | -- | -- | -- |

**Notes:**
- The `overlords` namespace is read by Applications (via `addOverlordsToThread`), Trial Review (same), and Guild Info (via `updateRecruitment`), but only written by the Raids domain commands.
- The `raiders` namespace is read by Loot (to resolve userIds to character names in `updateLootPost`) and by `interactionCreate.js` (to validate loot button clicks).
- The `ignoredCharacters` namespace is written by `interactionCreate.js` when the `ignore_missing_character` button is clicked in the bot-setup channel.
