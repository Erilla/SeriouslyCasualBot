# 04 -- Trial Review System

> Domain: Probationary member tracking with scheduled review alerts, WarcraftLogs integration, and promotion scheduling.
> Files: 24 files in `functions/trial-review/`, 1 command file, 1 shared utility.

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Inventory](#2-file-inventory)
3. [Data Model](#3-data-model)
4. [Trial Lifecycle](#4-trial-lifecycle)
5. [Date Calculations](#5-date-calculations)
6. [Trial Creation](#6-trial-creation)
7. [Review Content Format](#7-review-content-format)
8. [Trial Info Modal](#8-trial-info-modal)
9. [Alert System](#9-alert-system)
10. [WarcraftLogs Integration](#10-warcraftlogs-integration)
11. [Trial Modification](#11-trial-modification)
12. [Thread Maintenance](#12-thread-maintenance)
13. [Promotion Scheduling](#13-promotion-scheduling)
14. [Slash Commands](#14-slash-commands)
15. [Button and Modal Specifications](#15-button-and-modal-specifications)
16. [Scheduled Tasks](#16-scheduled-tasks)
17. [Configuration Dependencies](#17-configuration-dependencies)
18. [Known Quirks and Notes](#18-known-quirks-and-notes)

---

## 1. Overview

The trial review system manages probationary guild members ("trials") from acceptance
through their review period to promotion or closure. Each trial gets a dedicated Discord
thread with scheduled review dates, automated alert notifications, and WarcraftLogs raid
attendance tracking.

```
                      Application Accepted
                             |
                             v
                   +--------------------+
                   | addNewTrialInfo    |
                   | Modal submitted    |
                   +--------------------+
                             |
                             v
                   +--------------------+
                   | createTrialReview  |
                   | Thread             |
                   | - review message   |
                   |   (4 buttons)      |
                   | - logs message     |
                   |   (pinned)         |
                   | - overlords added  |
                   +--------------------+
                             |
             +---------------+---------------+
             |               |               |
             v               v               v
      +------------+  +------------+  +-------------+
      | First      |  | Update     |  | WarcraftLogs|
      | Review     |  | (modal)    |  | refresh     |
      | Alert      |  |            |  | (60 min)    |
      | (2 weeks)  |  +------------+  +-------------+
      +------------+
             |
             v
      +------------+
      | Final      |
      | Review     |
      | Alert      |
      | (4 weeks)  |
      +------------+
             |
      +------+------+------+
      |      |             |
      v      v             v
  +------+ +--------+ +--------+
  |Extend| |Mark for| | Close  |
  |(+7d) | |Promote | |        |
  +------+ +--------+ +--------+
      |         |          |
      v         v          v
  Extended  Promotion   Trial
  Review    Alert at    removed
  Alert     next raid   from DB
            day 17:30
```

---

## 2. File Inventory

| File | Exports | Purpose |
|------|---------|---------|
| `createTrialReviewThread.js` | `createTrialReviewThread` | Creates channel message, thread, logs message, sets up alerts |
| `calculateReviewDates.js` | `calculateReviewDates` | Computes start, first review, final review dates |
| `calculateExtendedDates.js` | `calculateExtendedDates` | Computes extended review dates after final |
| `generateTrialReviewContent.js` | `generateTrialReviewContent` | Builds the text content for the review message |
| `generateTrialReviewMessage.js` | `generateTrialReviewMessage` | Wraps content with 4-button ActionRow |
| `generateTrialLogsContent.js` | `generateTrialLogsContent` | Fetches WarcraftLogs and formats links |
| `generateTrialAlert.js` | `generateTrialAlert` | Creates alert objects for all review dates |
| `checkForReviewAlerts.js` | `checkForReviewAlerts` | 3-min poll: fires alerts when review dates pass |
| `alertTrialReview.js` | `alertTrialReview` | Sends admin ping to trial thread |
| `alertPromotions.js` | `alertPromotions` | 5-min poll: fires promotion alerts |
| `markToPromote.js` | `markToPromote` | Calculates next raid day, stores promote alert |
| `changeTrialInfo.js` | `changeTrialInfo` | Merges updates, refreshes message/thread/alerts |
| `extendTrial.js` | `extendTrial` | Increments extension counter, regenerates alerts |
| `removeTrial.js` | `removeTrial` | Deletes trial and alerts from DB |
| `getCurrentTrials.js` | `getCurrentTrials` | Dumps all trials as JSON string |
| `getTrialLogs.js` | `getTrialLogs` | OAuth2 + GraphQL to WarcraftLogs API |
| `trialInfoModal.js` | `createTrialInfoModal`, `updateTrialInfoModal` | Builds and shows the trial info modal |
| `dateInputValidator.js` | `dateInputValidator` | Regex validation for YYYY-MM-DD input |
| `keepTrialThreadAlive.js` | `keepTrialThreadAlive` | Single thread unarchive/keep-alive |
| `keepTrialThreadsAlive.js` | `keepTrialThreadsAlive` | Iterates all trials, calls single keep-alive |
| `updateTrialLogs.js` | `updateTrialLogs` | Iterates all trials, refreshes logs content |
| `updateTrialLogsContent.js` | `updateTrialLogsContent` | Edits a single trial's logs message |
| `updateTrailReviewMessages.js` | `updateTrailReviewMessages` | Regenerates all trial review messages (note: typo "Trail" in filename) |
| `updateTrialAlerts.js` | `updateTrialAlerts` | Regenerates alerts for a single trial |
| `../addOverlordsToThread.js` | `addOverlordsToThread` | Shared utility: adds overlord users to thread |
| `../../commands/trials.js` | `{ data, execute }` | `/trials` command group (6 subcommands) |

---

## 3. Data Model

Three Keyv namespaces store trial state.

### 3.1 `trials` namespace

```
Key:   thread ID (string) -- Discord thread ID in trialReviewChannelId
Value: {
    characterName: string,     // WoW character name
    role:          string,     // Role description (e.g., "Resto Druid")
    startDate:     string,     // ISO date string (e.g., "2024-03-15")
    extended:      number,     // Count of 1-week extensions (0 or undefined if none)
    trialReviewId: string,     // Discord message ID of the review message in channel
    trialLogsId:   string      // Discord message ID of the pinned logs message in thread
}
```

### 3.2 `trialAlerts` namespace

```
Key:   thread ID (string) -- matches key in trials namespace
Value: [
    {
        name:    string,    // "First Review", "Final Review", or "Extended Review (N)"
        date:    Date,      // JavaScript Date object (serialized as ISO string in DB)
        alerted: boolean    // true if alert has already fired
    },
    ...
]
```

Alert array always has at least 2 entries (first + final review). Each extension adds one more.

### 3.3 `promoteAlerts` namespace

```
Key:   thread ID (string) -- matches key in trials namespace
Value: Date                -- next raid day at 17:30 (serialized as ISO string in DB)
```

Lifecycle: created by `markToPromote`, deleted by `alertPromotions` after the alert fires.

---

## 4. Trial Lifecycle

```
State Machine:

  +----------+     createTrialReviewThread      +--------+
  | Accepted | -------------------------------->| Active |
  +----------+                                  +--------+
                                                    |
                              checkForReviewAlerts (3 min poll)
                                                    |
                            +-----------------------+
                            |                       |
                            v                       v
                     +--------------+        +--------------+
                     | First Review |        | Final Review |
                     | (2 weeks)    |        | (4 weeks)    |
                     +--------------+        +--------------+
                                                    |
                                 +------------------+------------------+
                                 |                  |                  |
                                 v                  v                  v
                          +-----------+      +-----------+      +-----------+
                          | Extended  |      | Marked    |      | Closed    |
                          | (+7 days) |      | for       |      | (removed  |
                          +-----------+      | Promotion |      |  from DB) |
                                |            +-----------+      +-----------+
                                |                  |
                                v                  v
                          +-----------+      +-----------+
                          | Extended  |      | Promotion |
                          | Review    |      | Alert     |
                          | Alert     |      | (next     |
                          +-----------+      |  raid day |
                                             |  17:30)   |
                                             +-----------+
```

Each state transition is triggered by either:
- A scheduled poll (`checkForReviewAlerts`, `alertPromotions`)
- A button click (Update, Extend, Mark for Promotion, Close)
- A slash command (`/trials change_trial_info`, `/trials remove_trial`)

---

## 5. Date Calculations

### 5.1 Review Dates

**File:** `calculateReviewDates.js`

```
calculateReviewDates(startDate) -> { startDate, firstReviewDate, finalReviewDate }:

    Constants:
        weeksUntilFirstReview = 2
        weeksUntilFinalReview = 4

    startDate = new Date(startDate)
    startDate.setHours(22)
    startDate.setMinutes(0)

    firstReviewDate = new Date(startDate)
    firstReviewDate.setDate(firstReviewDate.getDate() + 2 * 7)  // +14 days

    finalReviewDate = new Date(startDate)
    finalReviewDate.setDate(finalReviewDate.getDate() + 4 * 7)  // +28 days

    return { startDate, firstReviewDate, finalReviewDate }
```

**All dates are set to 22:00 local server time** via the start date's `setHours(22)` call,
which propagates to the derived dates since they are cloned from the start date.

### 5.2 Extended Dates

**File:** `calculateExtendedDates.js`

```
calculateExtendedDates(startDate, extended) -> Date[]:

    { finalReviewDate } = calculateReviewDates(startDate)
    extendedReviewDates = []

    for index = 0 to extended - 1:
        extendedDate = new Date(finalReviewDate)
        extendedDate.setDate(extendedDate.getDate() + (index + 1) * 7)
        extendedReviewDates.push(extendedDate)

    return extendedReviewDates
```

**Each extension adds 7 days from the FINAL review date**, not from the previous extension.
So with `extended = 3`:
- Extension 1: finalReviewDate + 7 days
- Extension 2: finalReviewDate + 14 days
- Extension 3: finalReviewDate + 21 days

### 5.3 Date Calculation Timeline

```
Day 0          Day 14         Day 28         Day 35         Day 42
|              |              |              |              |
Start          First          Final          Extended(1)    Extended(2)
Date           Review         Review         Review         Review
22:00          22:00          22:00          22:00          22:00
```

### 5.4 Promotion Date: nextDay Algorithm

**File:** `markToPromote.js`

```
nextDay(x) -> Date:
    now = new Date()
    now.setDate(now.getDate() + (x + (7 - now.getDay())) % 7)
    return now
```

Where `x` is the target day of week (0 = Sunday, 3 = Wednesday).

The algorithm finds the next occurrence of day `x`:
- If today IS day `x`, it returns today (the modulo result is 0).
- Otherwise it calculates the forward distance to the target day.

**Promotion date selection:**
```
nextSunday    = nextDay(0)
nextWednesday = nextDay(3)
nextRaidDay   = min(nextSunday, nextWednesday)  // whichever comes sooner
nextRaidDay.setHours(17)
nextRaidDay.setMinutes(30)
```

The promotion alert will fire at **17:30 on the next Sunday or Wednesday**, whichever is
closer to the current date.

---

## 6. Trial Creation

**File:** `createTrialReviewThread.js`

```
createTrialReviewThread(client, trial):

    // trial = { characterName, role, startDate }

    // 1. Fetch the trial review channel
    trialReviewChannel = await client.channels.fetch(config.trialReviewChannelId)

    // 2. Generate review message (content + 4 buttons)
    trialReviewMessage = generateTrialReviewMessage(trial)

    // 3. Send to channel
    message = await trialReviewChannel.send(trialReviewMessage)

    // 4. Create thread from message
    thread = await message.startThread({
        name: "${trial.characterName} Review"
    })
    thread.setAutoArchiveDuration(ThreadAutoArchiveDuration.OneWeek)

    // 5. Store review message ID
    trial.trialReviewId = message.id

    // 6. Generate and send logs content (WarcraftLogs links)
    trialLogsContent = await generateTrialLogsContent(trial)
    trialLogsMessage = await thread.send(trialLogsContent)
    trial.trialLogsId = trialLogsMessage.id
    await trialLogsMessage.pin()

    // 7. Save trial data and set up alerts
    await changeTrialInfo(client, thread.id, trial)

    // 8. Add overlord users to thread
    await addOverlordsToThread(thread)
```

**Thread structure after creation:**

```
#trial-review-channel
|
+-- [Message] "**CharName** - Role\nStart Date: ...\nFirst Review: ...\nFinal Review: ..."
    |  [Buttons] Update | Extend Trial by 1 Week | Mark for Promotion | Close
    |
    +-- [Thread] "CharName Review"
        |
        +-- [Pinned Message] "Logs:\nhttps://www.warcraftlogs.com/reports/ABC123\n..."
```

---

## 7. Review Content Format

**File:** `generateTrialReviewContent.js`

```
generateTrialReviewContent(characterName, role, inputStartDate, extended) -> string:

    { startDate, firstReviewDate, finalReviewDate } = calculateReviewDates(inputStartDate)

    content  = "**{characterName}** - {role}\n"
    content += "Start Date: {startDate.toDateString()} <t:{unixSeconds}:R>\n"
    content += "First Review: {firstReviewDate.toDateString()} <t:{unixSeconds}:R>\n"
    content += "Final Review: {finalReviewDate.toDateString()} <t:{unixSeconds}:R>\n"

    if extended:
        extendedDates = calculateExtendedDates(startDate, extended)
        for each (extendedDate, index) in extendedDates:
            content += "Extended Review ({index + 1}): {date.toDateString()} <t:{unixSeconds}:R>\n"

    return content
```

**Unix seconds calculation:** `Math.floor(date.valueOf() / 1000)`

**Discord timestamp format:** `<t:UNIX_SECONDS:R>` renders as a relative time
(e.g., "in 14 days", "2 weeks ago").

**Example output:**
```
**Exampletoon** - Holy Paladin
Start Date: Mon Mar 04 2024 <t:1709589600:R>
First Review: Mon Mar 18 2024 <t:1710799200:R>
Final Review: Mon Apr 01 2024 <t:1712008800:R>
Extended Review (1): Mon Apr 08 2024 <t:1712613600:R>
```

---

## 8. Trial Info Modal

**File:** `trialInfoModal.js`

Two modal variants share the same field layout:

| Modal | Custom ID | Title | Triggered By |
|-------|-----------|-------|--------------|
| Create | `addNewTrialInfoModal` | "Add New Trial Info" | Accepted button (applications) or `/trials create_thread` |
| Update | `updateTrialInfoModal` | "Update Trial Info" | Update button on trial review message |

### 8.1 Modal Fields

| Field | Custom ID | Style | Min | Max | Pre-filled (update only) |
|-------|-----------|-------|-----|-----|-------------------------|
| Character Name | `characterNameInput` | `TextInputStyle.Short` | 3 | 100 | `trial.characterName` |
| Role | `roleInput` | `TextInputStyle.Short` | 1 | 300 | `trial.role` |
| Start Date (YYYY-MM-DD) | `startDateInput` | `TextInputStyle.Short` | 10 | 10 | `formatDate(trial.startDate)` |

**Pre-fill logic (update modal only):**
```
if interaction.isButton():
    threadId = interaction.message.thread.id
    trial = await trials.get(threadId)
    if trial:
        characterNameInput.setValue(trial.characterName)
        roleInput.setValue(trial.role)
        startDateInput.setValue(formatDate(trial.startDate))
```

**Date formatting for pre-fill:**
```
formatDate(date) -> string:
    [dateStr] = new Date(date).toISOString().split('T')
    return dateStr  // "YYYY-MM-DD"
```

### 8.2 Date Validation

**File:** `dateInputValidator.js`

```
dateInputValidator(date) -> RegExpExecArray | null:
    dateRegex = /^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/
    return dateRegex.exec(date)
```

Validates:
- Exactly 10 characters
- Format: `YYYY-MM-DD`
- Month: 01-12
- Day: 01-31

**Note:** Does not validate day-of-month correctness (e.g., Feb 31 passes). The regex only
checks format, not calendar validity.

---

## 9. Alert System

### 9.1 Alert Generation

**File:** `generateTrialAlert.js`

```
generateTrialAlert(trial) -> Array<{ name, date, alerted }>:

    trialAlert = []

    { firstReviewDate, finalReviewDate } = calculateReviewDates(trial.startDate)

    trialAlert.push(createTrialAlertObject('First Review', firstReviewDate))
    trialAlert.push(createTrialAlertObject('Final Review', finalReviewDate))

    if trial.extended:
        extendedDates = calculateExtendedDates(trial.startDate, trial.extended)
        for each (extendedDate, index) in extendedDates:
            trialAlert.push(createTrialAlertObject(
                `Extended Review (${index})`,   // NOTE: 0-indexed in alert name
                extendedDate
            ))

    return trialAlert

createTrialAlertObject(name, date) -> { name, date, alerted }:
    return {
        name: name,
        date: date,
        alerted: new Date(date) < new Date()  // Pre-mark past dates as already alerted
    }
```

**Note:** Extended review alert names are 0-indexed (`Extended Review (0)`) while the
review content display is 1-indexed (`Extended Review (1)`). This is a cosmetic
inconsistency but does not affect functionality since the name is only used in the alert
message.

### 9.2 Review Alert Polling

**File:** `checkForReviewAlerts.js`
**Interval:** 3 minutes (180,000 ms) via `setInterval` in `events/ready.js`

```
checkForReviewAlerts(client):

    for await (const [threadId, trial] of trials.iterator()):

        trialAlert = await trialAlerts.get(threadId)

        // Auto-create alerts if missing
        if trialAlert is undefined:
            trialAlert = generateTrialAlert(trial)
            await trialAlerts.set(threadId, trialAlert)

        for each alert (by index) in trialAlert:
            if new Date(alert.date) < new Date() AND !alert.alerted:
                await alertTrialReview(client, threadId, alert.name)
                alert.alerted = true
                trialAlert[index] = alert
                await trialAlerts.set(threadId, trialAlert)
```

**Self-healing:** If a trial exists but has no alert entries (e.g., data was manually
deleted), `checkForReviewAlerts` regenerates them via `generateTrialAlert`.

### 9.3 Alert Delivery

**File:** `alertTrialReview.js`
**Hardcoded admin role ID:** `'255630010088423425'`

```
alertTrialReview(client, threadId, alertName):
    trialReviewChannel = await client.channels.fetch(config.trialReviewChannelId)
    thread = await trialReviewChannel.threads.fetch(threadId)
    if thread:
        await thread.send("<@&255630010088423425> ${alertName}")
    else:
        log "Could not find Thread ${threadId}"
```

The alert message mentions the admin role and includes the alert name (e.g., "First Review",
"Final Review", "Extended Review (0)").

### 9.4 Alert Update

**File:** `updateTrialAlerts.js`

```
updateTrialAlerts(threadId):
    trial = await trials.get(threadId)
    trialAlert = generateTrialAlert(trial)  // Complete regeneration
    await trialAlerts.set(threadId, trialAlert)
```

**Called by:** `changeTrialInfo` after updating trial data. This completely regenerates
the alert array, which means previously-fired alerts get their `alerted` flag recalculated
based on whether the date is in the past.

---

## 10. WarcraftLogs Integration

**File:** `getTrialLogs.js`
**Authentication:** OAuth2 client credentials
**API:** GraphQL

### 10.1 OAuth2 Token Acquisition

```
getToken() -> string (access_token):

    body = URLSearchParams({
        client_id:     config.warcraftLogsClientId,
        client_secret: config.warcraftLogsClientSecret,
        grant_type:    'client_credentials'
    }).toString()

    POST https://www.warcraftlogs.com/oauth/token
    Headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    Body: body

    return response.access_token
```

**Token is acquired fresh on every call** -- no caching or refresh logic.

### 10.2 GraphQL Query

```
getTrialLogs(characterName) -> string[] (array of report codes):

    token = await getToken()

    POST https://www.warcraftlogs.com/api/v2/client
    Headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${token}'
    }
    Body: {
        query: `
            query getGuildAttendance($guildId: Int){
                guildData {
                    guild (id: $guildId) {
                        id,
                        name,
                        attendance {
                            data {
                                code,
                                players  {
                                    name,
                                    presence,
                                    type
                                }
                            }
                        }
                    }
                }
            }
        `,
        variables: {
            'guildId': 486913
        }
    }
```

**Hardcoded guild ID:** `486913` (Seriously Casual on WarcraftLogs)

### 10.3 Response Processing

```
result.data.guildData.guild.attendance.data
    .map(report => {
        report.players = report.players.filter(
            p => p.name === characterName && p.presence === 1
        )
        return report.players.length ? report.code : null
    })
    .filter(code => code !== null)
    .reverse()  // Reverse to get chronological order (newest last -> newest first)
```

Returns an array of WarcraftLogs report codes where the character was present.

### 10.4 Logs Content Generation

**File:** `generateTrialLogsContent.js`

```
generateTrialLogsContent(trial) -> string:
    baseUrl = 'https://www.warcraftlogs.com/reports/'
    content = 'Logs:\n'

    logCodes = await getTrialLogs(trial.characterName)

    for each code in logCodes:
        content += '${baseUrl}${code}\n'

    return content
```

**Example output:**
```
Logs:
https://www.warcraftlogs.com/reports/ABC123def
https://www.warcraftlogs.com/reports/XYZ789ghi
```

### 10.5 Logs Update

**File:** `updateTrialLogsContent.js`

```
updateTrialLogsContent(client, trial):
    trialReviewChannel = await client.channels.fetch(config.trialReviewChannelId)
    trialReviewMessage = await trialReviewChannel.messages.fetch(trial.trialReviewId)

    if trial.trialLogsId:
        trialLogsMessage = await trialReviewMessage.thread.messages.fetch(trial.trialLogsId)
        await trialLogsMessage.edit(await generateTrialLogsContent(trial))
        await trialLogsMessage.pin()  // Re-pin (idempotent if already pinned)
    else:
        log "Cannot find Trial Log Message for ${trial.characterName}"
```

**File:** `updateTrialLogs.js` (bulk update)

```
updateTrialLogs(client):
    for await (const [key, trial] of trials.iterator()):
        await updateTrialLogsContent(client, trial)
```

---

## 11. Trial Modification

### 11.1 Change Trial Info

**File:** `changeTrialInfo.js`

```
changeTrialInfo(client, threadId, trial):

    existingTrial = await trials.get(threadId)

    if existingTrial:
        // Merge: new values override existing, using nullish coalescing
        trial = {
            ...existingTrial,
            characterName: trial.characterName ?? existingTrial.characterName,
            role:          trial.role ?? existingTrial.role,
            startDate:     trial.startDate ?? existingTrial.startDate,
        }

        // Update the channel message content
        trialReviewChannel = client.channels.cache.get(config.trialReviewChannelId)
        message = await trialReviewChannel.messages.fetch(trial.trialReviewId)
        message.edit(generateTrialReviewContent(
            trial.characterName, trial.role, trial.startDate, trial.extended
        ))
        message.thread.name = "${trial.characterName} Review"

        // Update logs content
        await updateTrialLogsContent(client, trial)

    // Always save and regenerate alerts (even for new trials)
    await trials.set(threadId, trial)
    await updateTrialAlerts(threadId)
```

**Note:** When called for a NEW trial (from `createTrialReviewThread`), `existingTrial`
will be undefined, so the merge block is skipped and the trial is simply saved.

### 11.2 Extend Trial

**File:** `extendTrial.js`

```
extendTrial(threadId) -> string (new review content):

    trial = await trials.get(threadId)
    trialAlert = await trialAlerts.get(threadId)

    // Initialize extension counter if missing
    if !trial.extended:
        trial = { ...trial, extended: 0 }

    trial.extended++

    // Regenerate all alerts with new extension
    trialAlert = generateTrialAlert(trial)

    await trials.set(threadId, trial)
    await trialAlerts.set(threadId, trialAlert)

    // Return updated content for message edit
    return generateTrialReviewContent(
        trial.characterName, trial.role, trial.startDate, trial.extended
    )
```

### 11.3 Remove Trial

**File:** `removeTrial.js`

```
removeTrial(threadId):
    await trials.delete(threadId)
    await trialAlerts.delete(threadId)
```

Removes both the trial data and all associated alerts. Does NOT delete the `promoteAlerts`
entry if one exists.

### 11.4 Update All Review Messages

**File:** `updateTrailReviewMessages.js` (note: typo "Trail" in filename)

```
updateTrailReviewMessages(client):
    for await (const [threadId, trial] of trials.iterator()):
        trialReviewChannel = await client.channels.fetch(config.trialReviewChannelId)
        message = await trialReviewChannel.messages.fetch(trial.trialReviewId)

        newMessageContent = generateTrialReviewMessage(trial)
        await message.edit(newMessageContent)
```

Regenerates the full message (content + buttons) for every active trial. Useful after
code changes that affect message format.

---

## 12. Thread Maintenance

**Files:** `keepTrialThreadsAlive.js`, `keepTrialThreadAlive.js`
**Interval:** 6 minutes (360,000 ms)

```
keepTrialThreadsAlive(client):
    for await (const [threadId] of trials.iterator()):
        await keepTrialThreadAlive(client, threadId)

keepTrialThreadAlive(client, threadId):
    trialReviewChannel = await client.channels.fetch(config.trialReviewChannelId)
    thread = await trialReviewChannel.threads.fetch(threadId)

    if thread:
        thread.setAutoArchiveDuration(ThreadAutoArchiveDuration.OneWeek)
        if thread.archived:
            thread.setArchived(false)  // Silently unarchive
    else:
        log "Could not find Thread ${threadId}"
```

**Differences from application thread keep-alive:**
- Uses `ThreadAutoArchiveDuration.OneWeek` (vs. OneDay for applications).
- Does NOT send an admin alert when unarchiving (silent operation).
- Does NOT delete tracking entries when thread is missing (trials persist in DB).

---

## 13. Promotion Scheduling

### 13.1 Mark for Promotion

**File:** `markToPromote.js`

```
markToPromote(client, threadId) -> boolean:

    // Guard: already marked
    existingAlert = await promoteAlerts.get(threadId)
    if existingAlert:
        log "already marked for promotion"
        return false

    // Get trial data (re-saves -- no actual change)
    trial = await trials.get(threadId)
    await trials.set(threadId, trial)

    // Calculate next raid day
    nextSunday    = nextDay(0)   // Next Sunday (or today if Sunday)
    nextWednesday = nextDay(3)   // Next Wednesday (or today if Wednesday)
    nextRaidDay   = min(nextSunday, nextWednesday)
    nextRaidDay.setHours(17)
    nextRaidDay.setMinutes(30)

    // Store promotion alert
    await promoteAlerts.set(threadId, nextRaidDay)

    // Notify in thread
    if thread:
        await thread.send("green_square **Marked for Promotion** green_square \nWill alert on ${nextRaidDay.toDateString()}")

    return true
```

### 13.2 Promotion Alert Polling

**File:** `alertPromotions.js`
**Interval:** 5 minutes (300,000 ms)
**Hardcoded admin role ID:** `'255630010088423425'`

```
alertPromotions(client):
    alerted = []  // Collect IDs to delete after iteration

    for await (const [threadId, dateValue] of promoteAlerts.iterator()):
        date = new Date(dateValue)

        if date < new Date():  // Time has passed
            trialReviewChannel = await client.channels.fetch(config.trialReviewChannelId)
            thread = await trialReviewChannel.threads.fetch(threadId)

            if thread:
                await thread.send("<@&255630010088423425> Promotion time!")
                alerted.push(threadId)
            else:
                log "Could not find Thread ${threadId}"

    // Delete fired alerts AFTER iteration (avoids modifying during iteration)
    for each id in alerted:
        await promoteAlerts.delete(id)
```

**Important:** The admin role ID `'255630010088423425'` is hardcoded directly in this file,
NOT read from `config.json`. This is also the case in `alertTrialReview.js` and
`keepApplicationThreadAlive.js`.

---

## 14. Slash Commands

### `/trials` Command Group

**File:** `commands/trials.js`

| Subcommand | Parameters | Behavior |
|------------|-----------|----------|
| `create_thread` | None | Opens `createTrialInfoModal` |
| `get_current_trials` | None | Replies with JSON dump of all trials (ephemeral) |
| `remove_trial` | `thread_id` (string, required) | Deletes trial and alerts, replies with success/error (ephemeral) |
| `change_trial_info` | `thread_id` (string, required), `character_name` (string, optional), `role` (string, optional), `start_date` (string, optional) | Partial update via `changeTrialInfo`, replies success (ephemeral) |
| `update_trial_logs` | None | Refreshes WarcraftLogs for all trials, replies when done (ephemeral) |
| `update_trial_review_messages` | None | Regenerates all review messages, replies "Updating..." then edits to "updated" (ephemeral) |

**getCurrentTrials output format:**
```
[Thread ID]: 123456789, [Value]: {"characterName":"Exampletoon","role":"Holy Paladin",...}

[Thread ID]: 987654321, [Value]: {"characterName":"Alttoon","role":"Frost Mage",...}
```

Returns `"No current trials!"` if the namespace is empty.

---

## 15. Button and Modal Specifications

### 15.1 Trial Review Buttons

Attached to the channel message created by `generateTrialReviewMessage`.

| CustomId | Label | Style | Handler |
|----------|-------|-------|---------|
| `updateTrialInfo` | `Update` | `ButtonStyle.Primary` (blue) | Opens `updateTrialInfoModal` |
| `extendTrialByOneWeek` | `Extend Trial by 1 Week` | `ButtonStyle.Secondary` (grey) | Calls `extendTrial(threadId)`, edits message with new content |
| `markForPromotion` | `Mark for Promotion` | `ButtonStyle.Success` (green) | Calls `markToPromote(client, threadId)`, replies with result |
| `closeTrial` | `Close` | `ButtonStyle.Danger` (red) | Archives thread, sends close message, calls `removeTrial(threadId)` |

### 15.2 Modal Handling (in interactionCreate.js)

**`addNewTrialInfoModal` submit:**
```
characterName = interaction.fields.getTextInputValue('characterNameInput')
role          = interaction.fields.getTextInputValue('roleInput')
startDate     = interaction.fields.getTextInputValue('startDateInput')

if !dateInputValidator(startDate):
    reply "Invalid date format..." (ephemeral)
    return

trial = { characterName, role, startDate }
createTrialReviewThread(interaction.client, trial)
archiveApplicationThread(interaction.client, threadId, 'Accepted')
reply "Trial thread created for ${characterName}" (ephemeral)
```

**`updateTrialInfoModal` submit:**
```
characterName = interaction.fields.getTextInputValue('characterNameInput')
role          = interaction.fields.getTextInputValue('roleInput')
startDate     = interaction.fields.getTextInputValue('startDateInput')

if !dateInputValidator(startDate):
    reply "Invalid date format..." (ephemeral)
    return

trial = { characterName, role, startDate }
threadId = interaction.message.thread.id
changeTrialInfo(interaction.client, threadId, trial)
reply "Updated" (ephemeral)
setTimeout(() => interaction.deleteReply(), 1000)  // Delete reply after 1 second
```

---

## 16. Scheduled Tasks

| Task | Interval | Function | Error Handling |
|------|----------|----------|----------------|
| Check Review Alerts | 3 min (180,000 ms) | `checkForReviewAlerts(client)` | try/catch, console.log |
| Alert Promotions | 5 min (300,000 ms) | `alertPromotions(client)` | try/catch, console.log |
| Keep Trial Threads Alive | 6 min (360,000 ms) | `keepTrialThreadsAlive(client)` | try/catch, console.log |
| Update Trial Logs | 60 min (3,600,000 ms) | `updateTrialLogs(client)` | try/catch, console.log |

All started via `setInterval` in `events/ready.js`. See [doc 12](12-scheduled-tasks.md).

---

## 17. Configuration Dependencies

| Config Key | Type | Used In | Purpose |
|------------|------|---------|---------|
| `databaseString` | String | All files | SQLite connection string |
| `trialReviewChannelId` | String | `createTrialReviewThread.js`, `alertTrialReview.js`, `alertPromotions.js`, `markToPromote.js`, `changeTrialInfo.js`, `keepTrialThreadAlive.js`, `updateTrialLogsContent.js`, `updateTrailReviewMessages.js` | Channel where trial review messages are posted |
| `warcraftLogsClientId` | String | `getTrialLogs.js` | OAuth2 client ID |
| `warcraftLogsClientSecret` | String | `getTrialLogs.js` | OAuth2 client secret |

**Hardcoded constants:**

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `adminRoleId` | `'255630010088423425'` | `alertTrialReview.js`, `alertPromotions.js` | Admin role mentioned in alerts |
| WarcraftLogs guild ID | `486913` | `getTrialLogs.js` | Guild identifier in GraphQL query |
| `weeksUntilFirstReview` | `2` | `calculateReviewDates.js` | Days to first review: 14 |
| `weeksUntilFinalReview` | `4` | `calculateReviewDates.js` | Days to final review: 28 |
| Review time | `22:00` | `calculateReviewDates.js` | Hour set on all review dates |
| Extension period | `7 days` | `calculateExtendedDates.js` | Each extension adds 7 days |
| Promotion time | `17:30` | `markToPromote.js` | Time set on promotion alert date |
| Raid days | Sunday (0), Wednesday (3) | `markToPromote.js` | Days considered for promotion scheduling |
| WarcraftLogs OAuth URL | `https://www.warcraftlogs.com/oauth/token` | `getTrialLogs.js` | Token endpoint |
| WarcraftLogs GraphQL URL | `https://www.warcraftlogs.com/api/v2/client` | `getTrialLogs.js` | API endpoint |

---

## 18. Known Quirks and Notes

1. **Filename typo:** `updateTrailReviewMessages.js` has "Trail" instead of "Trial" in
   the filename and function name (`updateTrailReviewMessages`). The export and all
   imports consistently use the typo, so it works correctly.

2. **Alert name indexing mismatch:** `generateTrialAlert` uses 0-indexed names
   (`Extended Review (0)`) while `generateTrialReviewContent` uses 1-indexed display
   (`Extended Review (1)`). The alert name appears in the thread notification message.

3. **No token caching:** `getTrialLogs` acquires a fresh OAuth2 token on every call.
   When `updateTrialLogs` runs (every 60 minutes), it makes one token request per active
   trial, plus one GraphQL query per trial.

4. **removeTrial does not clean promoteAlerts:** If a trial is removed while it has a
   pending promotion alert, the `promoteAlerts` entry remains. The `alertPromotions`
   function will attempt to fetch the thread and fail gracefully with a log message.

5. **changeTrialInfo re-saves unconditionally:** Even when called for a brand new trial
   (where `existingTrial` is undefined), it proceeds to save via `trials.set()` and
   regenerate alerts. This dual purpose (create + update) is by design.

6. **markToPromote re-saves trial without changes:** The function reads the trial,
   then immediately writes it back (`await trials.set(threadId, trial)`) without
   modifying any fields. This appears to be a no-op.

7. **Thread auto-archive set differently per domain:** Trial threads use
   `ThreadAutoArchiveDuration.OneWeek` while application threads use
   `ThreadAutoArchiveDuration.OneDay`. Trial keep-alive runs every 6 minutes
   vs. 3 minutes for applications.

8. **Silent unarchive for trials:** Unlike application threads, trial threads are
   silently unarchived without sending an admin notification.

9. **Date validation only checks format:** The `dateInputValidator` regex accepts
   impossible dates like `2024-02-31`. No calendar validation is performed.

10. **GraphQL query fetches entire guild attendance:** The query returns ALL attendance
    data for the guild (not filtered by date or character). Filtering by character name
    happens client-side after the full response is received. This means every call
    downloads the complete attendance history for guild ID 486913.
