# 12 - Scheduled Tasks

This document specifies every scheduled, recurring, and startup-only task in SeriouslyCasualBot. All tasks are initialized in `events/ready.js` (203 lines), which fires once when the Discord client emits the `ready` event.

---

## Overview

The bot uses three scheduling mechanisms:

1. **`setInterval`** -- For periodic tasks that run at fixed millisecond intervals. 8 tasks total (7 registered in `ready.js`, 1 registered internally by `checkApplications`).
2. **`node-cron`** -- For tasks that run on specific days/times using cron expressions. 3 tasks total.
3. **Startup-only** -- Functions that run once during initialization and do not repeat. 2 tasks total.

All tasks receive the Discord `client` object as their first parameter (except `addRaiders` which takes override flags).

---

## setInterval Tasks

All intervals are defined using the pattern:
```javascript
const taskNameMinutes = N,
    taskNameInterval = taskNameMinutes * 60 * 1000;
```

Tasks are listed in the order they are registered in `ready.js`.

### Task 1: Keep Application Threads Alive

| Property | Value |
|----------|-------|
| **Function** | `keepApplicationThreadsAlive(client)` |
| **File** | `functions/applications/keepApplicationThreadsAlive.js` |
| **Interval** | 3 minutes (180,000 ms) |
| **Domain** | Applications |
| **Error handling** | `try/catch` with `console.log("Failed to keep application threads alive.")` |
| **Purpose** | Prevents Discord from auto-archiving active application discussion threads |

**Behavior:**
1. Iterates all entries in `openApplicationThreads` namespace
2. For each thread ID, fetches the thread from `applicationsViewerChannelId`
3. Sets auto-archive duration to 1 day
4. If thread is archived: unarchives it, sends admin role mention alert
5. If thread fetch fails (deleted): removes entry from `openApplicationThreads`

---

### Task 2: Update Achievements

| Property | Value |
|----------|-------|
| **Function** | `updateAchievements({ client })` |
| **File** | `functions/guild-info/updateAchievements.js` |
| **Interval** | 30 minutes (1,800,000 ms) |
| **Domain** | Guild Info |
| **Error handling** | `try/catch` with `console.log("Failed to update achievements.")` |
| **Purpose** | Refreshes guild raid progress and world rankings from Raider.io |

**Behavior:**
1. Iterates expansions starting at 4, incrementing until Raider.io returns 400
2. Expansions 4-5: uses static data from `data/achievements.json`
3. Expansion 6+: fetches from `getRaidStaticData(expansion)` and `getRaidRankings(raidSlug)`
4. Calculates Cutting Edge status, kill progress, world rankings
5. Edits the existing achievements embed (stored via `achievementsPostId` in `guildinfo` namespace)

**Note:** The function signature uses `{ client }` (destructured object), not `client` directly. This is because it can also be called from a command interaction where `interaction` is passed, and both provide `client` as a property.

---

### Task 3: Update Trial Logs

| Property | Value |
|----------|-------|
| **Function** | `updateTrialLogs(client)` |
| **File** | `functions/trial-review/updateTrialLogs.js` |
| **Interval** | 60 minutes (3,600,000 ms) |
| **Domain** | Trial Review |
| **Error handling** | `try/catch` with `console.log("Failed to update Trial Logs Messages.")` |
| **Purpose** | Refreshes WarcraftLogs links for all active trial members |

**Behavior:**
1. Iterates all entries in `trials` namespace
2. For each trial, fetches latest WarcraftLogs attendance data via OAuth2 + GraphQL
3. Filters logs for the trial's character name
4. Updates the pinned logs message in the trial's thread

---

### Task 4: Keep Trial Threads Alive

| Property | Value |
|----------|-------|
| **Function** | `keepTrialThreadsAlive(client)` |
| **File** | `functions/trial-review/keepTrialThreadsAlive.js` |
| **Interval** | 6 minutes (360,000 ms) |
| **Domain** | Trial Review |
| **Error handling** | `try/catch` with `console.log("Failed to Keep Trial Threads Alive.")` |
| **Purpose** | Prevents Discord from auto-archiving active trial review threads |

**Behavior:**
1. Iterates all entries in `trials` namespace
2. For each trial, fetches the thread from `trialReviewChannelId`
3. Sets auto-archive duration to 1 week (`ThreadAutoArchiveDuration.OneWeek`)
4. If thread is archived: unarchives it

---

### Task 5: Check For Review Alerts

| Property | Value |
|----------|-------|
| **Function** | `checkForReviewAlerts(client)` |
| **File** | `functions/trial-review/checkForReviewAlerts.js` |
| **Interval** | 3 minutes (180,000 ms) |
| **Domain** | Trial Review |
| **Error handling** | `try/catch` with `console.log("Failed to Check For Review Alerts.")` |
| **Purpose** | Checks if any trial review dates have passed and sends alerts |

**Behavior:**
1. Iterates all entries in `trials` namespace
2. For each trial, fetches or creates alert entries in `trialAlerts` namespace
3. Compares each alert's date against `new Date()`
4. If date has passed and `alerted === false`:
   - Calls `alertTrialReview(client, threadId, alertName)` to send notification
   - Sets `alerted = true` and saves back to `trialAlerts`

---

### Task 6: Alert Promotions

| Property | Value |
|----------|-------|
| **Function** | `alertPromotions(client)` |
| **File** | `functions/trial-review/alertPromotions.js` |
| **Interval** | 5 minutes (300,000 ms) |
| **Domain** | Trial Review |
| **Error handling** | `try/catch` with `console.log("Failed to Check For Promotion Alerts.")` |
| **Purpose** | Sends promotion reminders when scheduled raid day arrives |

**Behavior:**
1. Iterates all entries in `promoteAlerts` namespace
2. For each entry, compares the stored Date against `new Date()`
3. If date has passed: sends `"<@&${adminRoleId}> Promotion time!"` to the trial thread
4. Collects alerted thread IDs in an array
5. After iteration completes, deletes all alerted entries from `promoteAlerts`

**Note:** The admin role ID is hardcoded as `'255630010088423425'` in `alertPromotions.js`, not read from config. Deletion happens in a separate loop after iteration to avoid modifying the collection during iteration.

---

### Task 7: Sync Raiders

| Property | Value |
|----------|-------|
| **Function** | `syncRaiders(client)` |
| **File** | `functions/raids/syncRaiders.js` |
| **Interval** | 10 minutes (600,000 ms) |
| **Domain** | Raids |
| **Error handling** | `try/catch` with `console.log("Failed to sync raiders.")` |
| **Purpose** | Synchronizes the stored raider list with the live Raider.io guild roster |

**Behavior:**
1. Fetches stored raiders, stored realms, and ignored characters from Keyv
2. Fetches live guild roster from `raiderioService.getGuildRoster()`
3. Filters roster: removes ignored characters
4. Comparison uses case-insensitive matching (`.toLowerCase()`)
5. Calculates diff:
   - Raiders to remove = stored names NOT in roster + stored names that are ignored
   - Raiders to add = roster names NOT in stored
   - Realms to remove = stored realm names NOT in roster
   - Realms to add = roster realm names NOT in stored
6. Executes removals and additions
7. Posts summary to `botSetupChannelId` (e.g., "Removed raiders:\nName1\n\nAdded raiders:\nName2\n")
8. Calls `sendAlertForRaidersWithNoUser` for newly added raiders (creates select menu + ignore button)

---

### Task 8: Check Applications (Internal)

| Property | Value |
|----------|-------|
| **Function** | `checkApplications(client)` |
| **File** | `functions/applications/checkApplications.js` |
| **Interval** | 5 minutes (300,000 ms) |
| **Domain** | Applications |
| **Error handling** | Internal try/catch within the function's own callbacks |
| **Purpose** | Detects new guild applications and copies them to the viewer channel |

**Note:** This task is different from the others. It is called once from `ready.js` as `await checkApplications(client)`, and then the function itself creates its own `setInterval` internally. It is NOT wrapped in a `setInterval` in `ready.js`.

**Behavior:**
1. Iterates all guilds in the client cache
2. For each guild, fetches all channels
3. Finds the channel matching `applicationsCategoryId`
4. For each child channel in the category:
   - Checks `openApplications` namespace for existing tracking
   - If not tracked: calls `copyApplicationToViewer(channel)`
5. If category has no children: calls `openApplications.clear()`

---

## node-cron Tasks

Cron expressions use the format: `second(opt) minute hour day-of-month month day-of-week`

### Cron Task 1: Alert Signups

| Property | Value |
|----------|-------|
| **Function** | `alertSignups(client)` |
| **File** | `functions/raids/alertSignups.js` |
| **Cron expression** | `0 19 * * 1,2,5,6` |
| **Schedule** | 7:00 PM every Monday, Tuesday, Friday, Saturday |
| **Domain** | Raids |
| **Error handling** | **None** -- no try/catch wrapper |
| **Purpose** | Reminds raiders who have not signed up for upcoming raids |

**Day-of-week mapping:**

| Day fired | Day of week | Reminder type | Setting checked | Raid day |
|-----------|-------------|---------------|-----------------|----------|
| Monday | 1 | 48-hour | `alertSignup_Wednesday_48` | Wednesday |
| Tuesday | 2 | 24-hour | `alertSignup_Wednesday` | Wednesday |
| Friday | 5 | 48-hour | `alertSignup_Sunday_48` | Sunday |
| Saturday | 6 | 24-hour | `alertSignup_Sunday` | Sunday |

**Behavior:**
1. Determines reminder type from `getDay()` switch statement
2. Checks the corresponding setting via `getSettings()` -- skips if `false`
3. Calculates next raid day date and sets time to 19:00 (`setHours(19, 0, 0)`)
4. Gets next planned Mythic raid via `getCurrentSignupsForNextRaid()`:
   - Calls `wowauditService.getUpcomingRaids()`
   - Filters: `difficulty === 'Mythic'` AND `status === 'Planned'`
   - Gets raid details via `wowauditService.getRaidDetails(id)`
5. Finds unsigned raiders: signups with `status === 'Unknown'`
6. Resolves Discord user IDs from `raiders` namespace
7. Selects random message from `data/signupAlertMessages.json` (64 messages)
8. 48-hour reminders include Discord relative time: `[<t:${unixSeconds}:R>]`
9. If all signed: sends celebration message `'Everyone has signed for the next raid'`

---

### Cron Task 2: M+ and Vault Reports

| Property | Value |
|----------|-------|
| **Function** | `alertHighestMythicPlusDone(client)` |
| **File** | `functions/raids/alertHighestMythicPlusDone.js` |
| **Cron expression** | `0 12 * * 3` |
| **Schedule** | 12:00 PM (noon) every Wednesday |
| **Domain** | Raids |
| **Error handling** | **None** -- no try/catch wrapper |
| **Purpose** | Posts weekly M+ and Great Vault reports as text file attachments |

**Behavior:**
1. Gets historical data from `wowauditService.getHistoricalData()` (previous period)
2. Iterates all raiders from `raiders` namespace
3. For each raider, gets realm from `raidersRealms` namespace

**Report 1: Highest Mythic+ Runs**
- Calls `raiderioService.getPreviousWeeklyHighestMythicPlusRun(region, realm, name)` per raider
- Format: `"${raiderName}: [${levels.join(', ')}]"` or `'Error'`/`'None'`
- Sent as `.txt` file attachment with filename: `highest_mythicplus_${today.toISOString()}.txt`

**Report 2: Great Vaults**
- Uses historical data from WoW Audit
- Column format with fixed-width padding: Character Name | Raid Options | Dungeon Options | World Options
- Vault options from: `data?.vault_options?.raids/dungeons/world?.option_1/2/3`
- Sent as `.txt` file attachment with filename: `great_vaults_${today.toISOString()}.txt`

Both files are posted to `weeklyCheckChannelId`.

---

### Cron Task 3: EPGP Priority Update

| Property | Value |
|----------|-------|
| **Function** | `updatePriorityRankingPost(client)` |
| **File** | `functions/epgp/priorityRankingPost.js` |
| **Cron expression** | `*/10 * * * *` |
| **Schedule** | Every 10 minutes (at :00, :10, :20, :30, :40, :50) |
| **Domain** | EPGP |
| **Error handling** | **None** -- no try/catch wrapper |
| **Purpose** | Updates the EPGP priority ranking display in the priority loot channel |

**Behavior:**
1. Fetches stored message IDs from `priorityLootPostConfig` namespace
2. Calls `generatePriorityRankingsPost()` which fetches data from `epgpService.getPriorityRankings()`
3. Edits the body message (raider data rows) and footer message (timestamps)
4. Does NOT update the header message (column names never change)

**Note:** If the messages have not been created yet (no stored IDs), the function will fail silently because the channel message fetch will not find `undefined` message IDs. The initial creation must be done manually via `/loot update_priority_post` with `create_post: true`.

---

## Startup-Only Tasks

These run once during the `ready` event and do not repeat.

### Startup Task 1: Check Applications (Initial Run)

| Property | Value |
|----------|-------|
| **Function** | `checkApplications(client)` |
| **File** | `functions/applications/checkApplications.js` |
| **Called as** | `await checkApplications(client)` |
| **Position** | First task in `ready.js` (line 40) |
| **Purpose** | Runs one immediate application check, then registers its own 5-minute interval internally |

This is the only task that is `await`-ed in `ready.js`. All subsequent tasks are registered after this completes.

---

### Startup Task 2: Seed Raiders

| Property | Value |
|----------|-------|
| **Function** | `addRaiders(false, false)` |
| **File** | `functions/raids/addRaiders.js` |
| **Called as** | `await addRaiders(false, false).then(...).catch(...)` |
| **Position** | After all setInterval registrations, before cron registrations (line 160) |
| **Purpose** | Seeds the raider database from JSON on first startup; no-op on subsequent startups |

**Parameters:** `override=false, useSeedData=false`

**Behavior:**
1. Checks for marker key `'SeriouslyCasualRaidersSeeded'` in `raiders` namespace
2. If NOT seeded:
   - Clears `raiders` namespace
   - Loads `data/raiders.json` (falls back to `data/raidersSeedData.json`)
   - Sets each raider: `raiders.set(name, userId)`
   - Sets marker: `raiders.set('SeriouslyCasualRaidersSeeded', true)`
   - Calls `updateRaiderJsonData()` to write backup
3. If already seeded: throws `'Did not seed raiders: Already seeded'` (caught by `.catch()`)

---

## Error Handling Patterns

### setInterval Tasks (7 in ready.js)

All seven `setInterval` tasks registered in `ready.js` use the same error handling pattern:

```javascript
setInterval(async () => {
    try {
        console.log(`${new Date().toLocaleString()}: Doing task...`);
        await taskFunction(client);
    }
    catch {
        console.log(
            `${new Date().toLocaleString()}: Failed to do task.`,
        );
    }
}, intervalMs);
```

Key characteristics:
- **Catch clause has no error parameter** -- the error object is discarded
- **Timestamp prefix** using `new Date().toLocaleString()` in both success and failure logs
- **Failure does not stop the interval** -- next execution proceeds normally
- **No retry logic** -- if a task fails, it simply waits for the next interval

### checkApplications (Internal setInterval)

The `checkApplications` function's internal `setInterval` does NOT use a top-level try/catch. Instead, individual operations within the function use `.catch(console.error)`. If the outer async callback throws, the error is unhandled.

### Cron Tasks (3 tasks)

All three cron tasks have **NO error wrapping**:

```javascript
cron.schedule('0 19 * * 1,2,5,6', async () => {
    await alertSignups(client);
});
```

If these tasks throw an uncaught exception, it could potentially crash the process. The functions themselves have internal error handling via `.catch()` chains, but there is no top-level safety net.

---

## Timeline Visualization

The following timeline shows when tasks fire over a typical week. Times are in server local time.

```
Monday:
  00:00 ----+---- 06:00 ----+---- 12:00 ----+---- 18:00 ----+---- 23:59
  |...........|...........|...........|............|
  Intervals running continuously:                  19:00
  - App threads alive  (every 3m)                  Alert Signups
  - Review alerts      (every 3m)                  (Wed 48hr)
  - Promotions         (every 5m)
  - App check          (every 5m)
  - Trial threads      (every 6m)
  - Sync raiders       (every 10m)
  - EPGP update        (every 10m, cron)
  - Achievements       (every 30m)
  - Trial logs         (every 60m)

Tuesday:
  00:00 ----+---- 06:00 ----+---- 12:00 ----+---- 18:00 ----+---- 23:59
  |...........|...........|...........|............|
                                                   19:00
                                                   Alert Signups
                                                   (Wed 24hr)

Wednesday (Reset Day):
  00:00 ----+---- 06:00 ----+---- 12:00 ----+---- 18:00 ----+---- 23:59
  |...........|...........|....X......|...........|
                               12:00
                               M+ & Vault Reports

Thursday:
  00:00 ----+---- 06:00 ----+---- 12:00 ----+---- 18:00 ----+---- 23:59
  |...........|...........|...........|...........|
  (No special events, only intervals)

Friday:
  00:00 ----+---- 06:00 ----+---- 12:00 ----+---- 18:00 ----+---- 23:59
  |...........|...........|...........|............|
                                                   19:00
                                                   Alert Signups
                                                   (Sun 48hr)

Saturday:
  00:00 ----+---- 06:00 ----+---- 12:00 ----+---- 18:00 ----+---- 23:59
  |...........|...........|...........|............|
                                                   19:00
                                                   Alert Signups
                                                   (Sun 24hr)

Sunday:
  00:00 ----+---- 06:00 ----+---- 12:00 ----+---- 18:00 ----+---- 23:59
  |...........|...........|...........|...........|
  (No special events, only intervals)
```

### Continuous Interval Summary

```
Every 3 minutes:   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+  (480/day)
                   keepApplicationThreadsAlive
                   checkForReviewAlerts

Every 5 minutes:   +---+---+---+---+---+---+---+---+---+--+  (288/day)
                   checkApplications (internal)
                   alertPromotions

Every 6 minutes:   +----+----+----+----+----+----+----+---+   (240/day)
                   keepTrialThreadsAlive

Every 10 minutes:  +--------+--------+--------+--------+--+   (144/day)
                   syncRaiders
                   updatePriorityRankingPost (via cron)

Every 30 minutes:  +--------------------------+-----------+    (48/day)
                   updateAchievements

Every 60 minutes:  +---------------------------------------------+  (24/day)
                   updateTrialLogs
```

---

## Execution Order in ready.js

The following shows the exact sequence of task registrations in `ready.js`:

```
ready event fires
  |
  +---> 1. await checkApplications(client)
  |        (runs immediately, registers internal 5m interval)
  |
  +---> 2. setInterval: keepApplicationThreadsAlive  (3m / 180,000ms)
  +---> 3. setInterval: updateAchievements           (30m / 1,800,000ms)
  +---> 4. setInterval: updateTrialLogs              (60m / 3,600,000ms)
  +---> 5. setInterval: keepTrialThreadsAlive        (6m / 360,000ms)
  +---> 6. setInterval: checkForReviewAlerts         (3m / 180,000ms)
  +---> 7. setInterval: alertPromotions              (5m / 300,000ms)
  |
  +---> 8. await addRaiders(false, false)
  |        (runs once, seeds DB, then continues)
  |
  +---> 9. cron.schedule: alertSignups               ('0 19 * * 1,2,5,6')
  +---> 10. cron.schedule: alertHighestMythicPlusDone ('0 12 * * 3')
  +---> 11. cron.schedule: updatePriorityRankingPost  ('*/10 * * * *')
  |
  +---> 12. setInterval: syncRaiders                 (10m / 600,000ms)
```

**Important:** `setInterval` tasks do NOT fire immediately -- they wait for the first interval to elapse. The first execution of each task happens N minutes after startup. Only `checkApplications` and `addRaiders` run immediately.

---

## Quick Reference Table

### All setInterval Tasks

| # | Task | Interval (min) | Interval (ms) | Function | Domain |
|---|------|---------------|---------------|----------|--------|
| 1 | Keep Application Threads Alive | 3 | 180,000 | `keepApplicationThreadsAlive(client)` | Applications |
| 2 | Update Achievements | 30 | 1,800,000 | `updateAchievements({ client })` | Guild Info |
| 3 | Update Trial Logs | 60 | 3,600,000 | `updateTrialLogs(client)` | Trial Review |
| 4 | Keep Trial Threads Alive | 6 | 360,000 | `keepTrialThreadsAlive(client)` | Trial Review |
| 5 | Check For Review Alerts | 3 | 180,000 | `checkForReviewAlerts(client)` | Trial Review |
| 6 | Alert Promotions | 5 | 300,000 | `alertPromotions(client)` | Trial Review |
| 7 | Sync Raiders | 10 | 600,000 | `syncRaiders(client)` | Raids |
| 8 | Check Applications (internal) | 5 | 300,000 | `checkApplications(client)` | Applications |

### All Cron Tasks

| # | Task | Expression | Human-Readable | Function | Domain |
|---|------|-----------|----------------|----------|--------|
| 1 | Alert Signups | `0 19 * * 1,2,5,6` | 7 PM Mon, Tue, Fri, Sat | `alertSignups(client)` | Raids |
| 2 | M+ & Vault Reports | `0 12 * * 3` | 12 PM (noon) Wednesday | `alertHighestMythicPlusDone(client)` | Raids |
| 3 | EPGP Priority Update | `*/10 * * * *` | Every 10th minute | `updatePriorityRankingPost(client)` | EPGP |

### Startup-Only Tasks

| # | Task | Function | Awaited | Position |
|---|------|----------|---------|----------|
| 1 | Check Applications | `checkApplications(client)` | Yes | First (line 40) |
| 2 | Seed Raiders | `addRaiders(false, false)` | Yes (with .then/.catch) | After intervals, before crons (line 160) |
