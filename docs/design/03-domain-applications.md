# 03 -- Application Pipeline

> Domain: Guild application monitoring, copying, voting, and archival.
> Files: 8 files in `functions/applications/`, 1 command file, 1 shared utility.

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Inventory](#2-file-inventory)
3. [Data Model](#3-data-model)
4. [Application Detection](#4-application-detection)
5. [Application Copy Pipeline](#5-application-copy-pipeline)
6. [Voting System](#6-voting-system)
7. [Voting Message Rendering](#7-voting-message-rendering)
8. [Thread Maintenance](#8-thread-maintenance)
9. [Thread Archival](#9-thread-archival)
10. [Cross-Domain Bridge](#10-cross-domain-bridge)
11. [Slash Commands](#11-slash-commands)
12. [Scheduled Tasks](#12-scheduled-tasks)
13. [Configuration Dependencies](#13-configuration-dependencies)
14. [Known Quirks and Notes](#14-known-quirks-and-notes)

---

## 1. Overview

The application pipeline detects new guild applications posted by an external bot into a
Discord category, copies them into a viewer channel for officer review, creates discussion
threads with voting, and ultimately archives the thread when the applicant is accepted or
rejected. Accepted applicants cross into the Trial Review domain (doc 04).

```
+---------------------------+       +-----------------------------+
| External Application Bot  |       | applicationsCategoryId      |
| posts into category       | ----> | (one channel per applicant) |
+---------------------------+       +-----------------------------+
                                               |
                                   checkApplications (5 min poll)
                                               |
                                               v
                                    +---------------------------+
                                    | copyApplicationToViewer   |
                                    | - reads messages          |
                                    | - slices into <=2000 char |
                                    | - posts to viewer channel |
                                    +---------------------------+
                                               |
                              +----------------+----------------+
                              |                                 |
                              v                                 v
                   +-------------------+          +-------------------------+
                   | Viewer Channel    |          | Discussion Thread       |
                   | (main message     |          | - overflow messages     |
                   |  + Accept/Reject) |          | - overlords added       |
                   +-------------------+          | - voting embed          |
                              |                   +-------------------------+
                              |                              |
                   +----------+----------+        keepApplicationThreadsAlive
                   |                     |               (3 min)
            acceptedApplicant     rejectedApplicant
                   |                     |
                   v                     v
          addNewTrialInfoModal   archiveApplicationThread
          (cross-domain: 04)       (sends outcome, archives)
```

---

## 2. File Inventory

| File | Lines | Exports | Purpose |
|------|-------|---------|---------|
| `checkApplications.js` | 52 | `checkApplications` | 5-min poll detecting new application channels |
| `copyApplicationToViewer.js` | 196 | `copyApplicationToViewer` | Full copy pipeline: retrieve, slice, post, thread, overlords |
| `createVotingThreadMessage.js` | 66 | `createVotingThreadMessage` | Creates or replaces voting embed in thread |
| `voteApplicant.js` | 98 | `voteForApplicant`, `voteNeutralApplicant`, `voteAgainstApplicant`, `voteKekwAgainstApplicant` | Vote recording with switch/removal logic |
| `generateVotingMessage.js` | 90 | `generateVotingMessage` | Renders progress-bar voting embed |
| `keepApplicationThreadAlive.js` | 43 | `keepApplicationThreadAlive` | Single thread keep-alive + unarchive |
| `keepApplicationThreadsAlive.js` | 15 | `keepApplicationThreadsAlive` | Iterates all tracked threads, calls single keep-alive |
| `archiveApplicationThread.js` | 41 | `archiveApplicationThread` | Removes buttons, sends outcome, archives |
| `../addOverlordsToThread.js` | 18 | `addOverlordsToThread` | Shared utility: adds overlord users to a thread |
| `../../commands/applicants.js` | 43 | `{ data, execute }` | `/applicants create_voting_message` command |

---

## 3. Data Model

Three Keyv namespaces store application state. All use `databaseString` from config.

### 3.1 `openApplications` namespace

Tracks the link between an application source channel and the discussion thread.

```
Key:   channel ID (string) -- the source channel in applicationsCategoryId
Value: thread ID (string) -- the discussion thread in applicationsViewerChannelId
```

Lifecycle:
- **Set** when `copyApplicationToViewer` finishes posting: `openApplications.set(newChannel.id, thread.id)`
- **Cleared** when the category has zero children: `openApplications.clear()`
- **Read** by `checkApplications` to detect untracked channels

### 3.2 `openApplicationThreads` namespace

Tracks active discussion threads for keep-alive purposes.

```
Key:   thread ID (string)
Value: undefined (set with no value argument, stored as Keyv default)
```

Lifecycle:
- **Set** when thread is created: `openApplicationThreads.set(thread.id)` (no second argument)
- **Deleted** on archival: `openApplicationThreads.delete(threadId)`
- **Deleted** if thread not found during keep-alive: `openApplicationThreads.delete(threadId)`
- **Read** by `keepApplicationThreadsAlive` iterator

### 3.3 `applicationVotes` namespace

Stores per-thread voting tallies.

```
Key:   thread ID (string)
Value: {
    messageId:    string,      // Discord message ID of the voting embed
    forVotes:     string[],    // Array of Discord user IDs
    neutralVotes: string[],    // Array of Discord user IDs
    againstVotes: string[],    // Array of Discord user IDs
    kekNo:        string[]     // Array of Discord user IDs (optional, lazy-initialized)
}
```

Lifecycle:
- **Set** when voting message created: initialized with empty arrays (note: `kekNo` NOT in initial object)
- **Updated** on every vote action
- **Read** by `generateVotingMessage` to render the embed

---

## 4. Application Detection

**File:** `checkApplications.js`
**Entry point:** Called once from `events/ready.js`; sets its own internal `setInterval`.
**Interval:** 5 minutes (300,000 ms)

### Algorithm

```
checkApplications(client):
    interval = 5 * 60 * 1000  // 300,000 ms
    log "Setting up Check Applications..."

    setInterval(async () => {
        for each guild in client.guilds.cache:
            channels = await guild.channels.fetch()

            for each channel in channels:
                if channel.id === config.applicationsCategoryId:
                    categoryChannel = channel

                    if categoryChannel.children.cache.size > 0:
                        for each childChannel in categoryChannel.children.cache:
                            existingThreadId = await openApplications.get(childChannel.id)
                            if existingThreadId is undefined:
                                await copyApplicationToViewer(childChannel)
                    else:
                        // No children means all applications processed
                        await openApplications.clear()
    }, interval)
```

### Key behaviors

- The function is called once at startup and manages its own recurring timer internally.
- Uses `typeof trackedChannelThreadId === 'undefined'` to detect untracked channels (strict check).
- When the category is completely empty, ALL entries in `openApplications` are cleared.
- Error handling: `.catch(console.error)` on channel fetch.

---

## 5. Application Copy Pipeline

**File:** `copyApplicationToViewer.js`
**Entry point:** `copyApplicationToViewer(newChannel)` called from `checkApplications`.

The pipeline has three stages: retrieve, slice, and post.

### 5.1 Guard check

```javascript
if (await openApplications.get(newChannel.id)) {
    // Already linked, skip
    return;
}
await wait(applicationCloneDelay);  // config value, default 2000ms
```

### 5.2 Stage 1: Retrieve Application

```
retrieveApplication(newChannel):
    application = ''
    messages = await newChannel.messages.fetch()
    for each message in messages.reverse():
        if message.embeds.length > 0:
            application += message.embeds[0].description + '\n'
    return application
```

- Reverses the message collection to get chronological order.
- Only reads the first embed's description from each message.
- Concatenates all embed descriptions with newline separators.

### 5.3 Stage 2: Slice Application Messages

```
sliceApplicationMessages(applicationMessages, application):
    maxLength = 2000
    tempMessage = ''

    // Check if application contains bold markdown
    boldCount = (application.match(/\*\*/g) || []).length

    if boldCount > 0:
        // Split on newlines, preserving the newline characters
        splitMessage = application.split(/(?=[\n])|(?<=[\n])/)
        questionFound = false

        for each line in splitMessage:
            if line matches /(.*(\\*\\*.*\\*\\*){1}.*)/  :
                // Line contains bold text = a question
                if questionFound:
                    // Push accumulated content + separator
                    applicationMessages.push(tempMessage.slice(0, maxLength))
                    applicationMessages.push('~~--------------------------------------------~~')
                    tempMessage = line
                else:
                    questionFound = true
                    if (tempMessage + line) > maxLength:
                        applicationMessages.push(tempMessage)
                        tempMessage = line
                    else:
                        tempMessage += line
            else if (tempMessage + line) > maxLength:
                applicationMessages.push(tempMessage)
                tempMessage = line
            else:
                tempMessage += line
    else:
        tempMessage = application

    // Handle remaining content
    if tempMessage > maxLength:
        // Hard-split at maxLength boundaries
        while remainingMessage.length > 0:
            applicationMessages.push(remainingMessage.slice(0, maxLength))
            remainingMessage = remainingMessage.slice(maxLength)
    else:
        applicationMessages.push(tempMessage)

    // Always append a trailing separator
    applicationMessages.push('~~--------------------------------------------~~')
    return applicationMessages
```

**Constants and patterns:**

| Constant | Value | Purpose |
|----------|-------|---------|
| `maxLength` | `2000` | Discord message character limit |
| Split regex | `/(?=[\n])\|(?<=[\n])/` | Lookahead/lookbehind split preserving newlines |
| Question regex | `/(.*(\\*\\*.*\\*\\*){1}.*)/` | Detects bold markdown (application questions) |
| Separator | `'~~--------------------------------------------~~'` | Strikethrough visual divider |

**Splitting behavior diagram:**

```
Input:  "**Question 1**\nAnswer 1\n**Question 2**\nAnswer 2\n..."

Output array:
  [0] "**Question 1**\nAnswer 1\n"
  [1] "~~--------------------------------------------~~"
  [2] "**Question 2**\nAnswer 2\n"
  [3] "~~--------------------------------------------~~"
  ...
  [N] "~~--------------------------------------------~~"    <-- always appended
```

### 5.4 Stage 3: Post Application Messages

```
postApplicationMessages(newChannel, viewerChannel, applicationMessages):

    // 1. Build Accept/Reject button row
    row = ActionRowBuilder with:
        ButtonBuilder: customId='acceptedApplicant', label='Accepted', style=ButtonStyle.Success
        ButtonBuilder: customId='rejectedApplicant', label='Rejected', style=ButtonStyle.Danger

    // 2. Concatenate first two message slices as main message
    mainMessage = applicationMessages[0] + applicationMessages[1]

    // 3. Send to viewer channel with buttons
    message = await viewerChannel.send({
        content: mainMessage,
        components: [row],
        embeds: []
    })

    // 4. Suppress embeds on the posted message
    await message.suppressEmbeds(true)

    // 5. Create discussion thread
    thread = await message.startThread({
        name: `${newChannel.name} discussion`
    })

    // 6. Track thread
    await openApplicationThreads.set(thread.id)

    // 7. Post remaining messages (index 2+) into thread
    if applicationMessages.length > 2:
        for each msg in applicationMessages.slice(2):
            threadMessage = await thread.send(msg)
            await threadMessage.suppressEmbeds(true)

    // 8. Link source channel to thread
    await openApplications.set(newChannel.id, thread.id)

    // 9. Wait 10 seconds then add overlords
    await wait(10000)
    await addOverlordsToThread(thread)

    // 10. Create voting message
    await createVotingThreadMessage(newChannel.client, thread.id)
```

**Key details:**
- The main message combines `applicationMessages[0]` and `applicationMessages[1]` -- typically the first question/answer block plus a separator.
- `suppressEmbeds(true)` is called on both the main message and all thread messages to prevent URL previews.
- The 10-second delay before adding overlords allows Discord to finish creating the thread.
- Thread name format: `"{original channel name} discussion"`.

### 5.5 Button Specifications

| CustomId | Label | Style | Action |
|----------|-------|-------|--------|
| `acceptedApplicant` | `Accepted` | `ButtonStyle.Success` (green) | Opens `addNewTrialInfoModal` (admin only) |
| `rejectedApplicant` | `Rejected` | `ButtonStyle.Danger` (red) | Archives thread with "Rejected" reason (admin only) |

---

## 6. Voting System

**File:** `voteApplicant.js`
**Keyv namespace:** `applicationVotes`

### 6.1 Vote Types

| Export | Vote Category | Also updates `kekNo`? |
|--------|---------------|----------------------|
| `voteForApplicant` | `forVotes` | No |
| `voteNeutralApplicant` | `neutralVotes` | No |
| `voteAgainstApplicant` | `againstVotes` | No |
| `voteKekwAgainstApplicant` | `againstVotes` + `kekNo` | Yes |

### 6.2 Vote Flow Algorithm

All vote functions follow the same pattern:

```
voteXxx(userId, threadId):
    votes = await applicationVotes.get(threadId)
    alreadyVoted = checkIfAlreadyVoted(userId, votes)
    votes = removeVoter(alreadyVoted, userId, votes)
    votes.xxxVotes.push(userId)
    await saveVotes(threadId, votes)
```

### 6.3 Already-Voted Check

```
checkIfAlreadyVoted(userId, votes) -> number:
    if userId in votes.forVotes:     return 1
    if userId in votes.neutralVotes: return 2
    if userId in votes.againstVotes: return 3
    return 0  // not voted
```

Uses `Array.some(voter => voter === userId)` for strict equality comparison.

### 6.4 Vote Removal (Switch Handling)

```
removeVoter(alreadyVoted, userId, votes) -> votes:
    switch (alreadyVoted):
        case 1: votes.forVotes     = filter out userId
        case 2: votes.neutralVotes = filter out userId
        case 3: votes.againstVotes = filter out userId
                // ALSO clean kekNo when removing from against
                if !votes.kekNo: votes.kekNo = []
                votes.kekNo = votes.kekNo.filter(voter => voter != userId)
                                                          ^^ NOTE: loose equality (!=)
    return votes
```

**Important:** The `kekNo` cleanup in case 3 uses loose equality (`!=`) instead of strict
inequality (`!==`). This is the only place in the voting system that uses loose comparison.

### 6.5 KekW Against (Dual-Category Vote)

```
voteKekwAgainstApplicant(userId, threadId):
    await voteAgainstApplicant(userId, threadId)  // standard against vote
    votes = await applicationVotes.get(threadId)   // re-fetch from DB
    if !votes.kekNo:
        votes.kekNo = []
    votes.kekNo.push(userId)
    await saveVotes(threadId, votes)
```

- Calls `voteAgainstApplicant` first (which handles switch logic).
- Then re-reads votes from the database.
- Lazy-initializes the `kekNo` array if missing.
- A KekW vote always appears in BOTH `againstVotes` and `kekNo`.

### 6.6 Vote Saving

```
saveVotes(threadId, votes):
    await applicationVotes.set(threadId, votes)
```

---

## 7. Voting Message Rendering

**File:** `generateVotingMessage.js`
**Dependencies:** `ongoing` package (ProgressBar), `discord.js` (EmbedBuilder)

### 7.1 Voting Message Creation

**File:** `createVotingThreadMessage.js`

```
createVotingThreadMessage(client, threadId):
    thread = fetch from applicationsViewerChannelId

    // Delete existing voting message if one exists
    existingVotes = await applicationVotes.get(threadId)
    if existingVotes:
        delete message existingVotes.messageId from thread

    // Build 4-button row
    row = ActionRowBuilder with:
        ButtonBuilder: customId='voteFor',         label='For',     style=ButtonStyle.Success
        ButtonBuilder: customId='voteNeutral',     label='Neutral', style=ButtonStyle.Secondary
        ButtonBuilder: customId='voteAgainst',     label='Against', style=ButtonStyle.Danger
        ButtonBuilder: customId='voteKekWAgainst', label=' ',       style=ButtonStyle.Danger,
                       emoji='777828455735230474'

    messageEmbed = await generateVotingMessage(threadId)
    message = await thread.send({ ...messageEmbed, components: [row] })

    // Initialize vote tracking (NOTE: kekNo NOT included in initial object)
    await applicationVotes.set(threadId, {
        messageId: message.id,
        forVotes: [],
        neutralVotes: [],
        againstVotes: [],
    })
```

### 7.2 Voting Button Specifications

| CustomId | Label | Style | Emoji |
|----------|-------|-------|-------|
| `voteFor` | `For` | `ButtonStyle.Success` (green) | None |
| `voteNeutral` | `Neutral` | `ButtonStyle.Secondary` (grey) | None |
| `voteAgainst` | `Against` | `ButtonStyle.Danger` (red) | None |
| `voteKekWAgainst` | ` ` (space) | `ButtonStyle.Danger` (red) | `777828455735230474` (KEKW) |

### 7.3 Embed Generation

```
generateVotingMessage(threadId) -> { embeds: [EmbedBuilder] }:
    votes = await applicationVotes.get(threadId)
    if !votes:
        votes = { forVotes: [], neutralVotes: [], againstVotes: [], kekNo: [] }

    votersContent = generateVotersContent(votes)
    // votersContent.for     = "<@userId1> <@userId2> ..."
    // votersContent.neutral = "<@userId3> ..."
    // votersContent.against = "<@userId4> ..."

    if !votes.kekNo: votes.kekNo = []
    kekWs = generateKekWs(votes.kekNo.length)
    // kekWs = "<:KEKW:777828455735230474>" repeated N times

    total = forVotes.length + neutralVotes.length + againstVotes.length

    bar = new ProgressBar(':bar', {
        total: 50,
        width: 10,
        completedChar: '(white square)',
        incompletedChar: '(black square)',
    })

    forBar     = bar.update(total ? forVotes.length / total : 0)
    neutralBar = bar.update(total ? neutralVotes.length / total : 0)
    againstBar = bar.update(total ? againstVotes.length / total : 0)

    embed = EmbedBuilder
        .setColor(0x0099FF)
        .setTitle('vote emoji Votes vote emoji')
        .setDescription(`Total Votes: ${total}`)
        .addFields(
            { name: 'For',
              value: `${forBar} (${forVotes.length})\n ${votersContent.for}` },
            { name: 'Neutral',
              value: `${neutralBar} (${neutralVotes.length})\n ${votersContent.neutral}` },
            { name: `Against ${kekWs}`,
              value: `${againstBar} (${againstVotes.length})\n ${votersContent.against}` },
        )
        .setTimestamp()

    return { embeds: [embed] }
```

### 7.4 Progress Bar Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| Format | `':bar'` | Bar-only format |
| `total` | `50` | Total units for the bar |
| `width` | `10` | Character width of the rendered bar |
| `completedChar` | `'⬜'` | White square for filled portion |
| `incompletedChar` | `'⬛'` | Black square for empty portion |

The `bar.update(ratio)` call takes a value between 0 and 1, returning a string of
`completedChar` and `incompletedChar` characters totaling `width` characters.

### 7.5 Embed Appearance

```
+------------------------------------------+
|  Color: #0099FF (blue)                   |
|                                          |
|  Title: "vote Votes vote" (emoji)        |
|  Description: "Total Votes: 3"           |
|                                          |
|  For                                     |
|  (white)(white)(white)(black)... (2)     |
|  @User1 @User2                           |
|                                          |
|  Neutral                                 |
|  (white)(black)(black)(black)... (1)     |
|  @User3                                  |
|                                          |
|  Against <:KEKW:...>                     |
|  (black)(black)(black)(black)... (0)     |
|                                          |
|  Timestamp: (auto, message creation)     |
+------------------------------------------+
```

### 7.6 KEKW Emoji

- Emoji ID: `777828455735230474`
- Full format string: `<:KEKW:777828455735230474>`
- Appears in the "Against" field name, repeated once per kekNo entry.
- The KekW button itself uses the emoji ID as the `.setEmoji()` argument.

---

## 8. Thread Maintenance

**Files:** `keepApplicationThreadsAlive.js`, `keepApplicationThreadAlive.js`
**Scheduled:** Every 3 minutes (180,000 ms) via `setInterval` in `events/ready.js`
**Hardcoded admin role ID:** `'255630010088423425'`

### 8.1 Iterator

```
keepApplicationThreadsAlive(client):
    for await (const [key, value] of openApplicationThreads.iterator()):
        await keepApplicationThreadAlive(client, key)
```

### 8.2 Single Thread Keep-Alive

```
keepApplicationThreadAlive(client, threadId):
    viewerChannel = await client.channels.fetch(applicationsViewerChannelId)
    thread = await viewerChannel.threads.fetch(threadId)

    if thread exists:
        thread.setAutoArchiveDuration(ThreadAutoArchiveDuration.OneDay)  // 1440 minutes

        if thread.archived:
            thread.setArchived(false)   // Unarchive
            await thread.send("<@&255630010088423425> Application still open - Keeping thread alive")
    else:
        // Thread no longer exists, clean up tracking
        await openApplicationThreads.delete(threadId)
```

**Behaviors:**
- Auto-archive duration is reset to 1 day on every check (every 3 minutes).
- If Discord auto-archived the thread, it is forcibly unarchived and an admin alert is sent.
- If the thread cannot be found at all, the tracking entry is cleaned up.

---

## 9. Thread Archival

**File:** `archiveApplicationThread.js`

```
archiveApplicationThread(client, threadId, reason):
    viewerChannel = await client.channels.fetch(applicationsViewerChannelId)
    thread = await viewerChannel.threads.fetch(threadId)

    if thread exists:
        // 1. Remove Accept/Reject buttons from the starter message
        initialMessage = await thread.fetchStarterMessage()
        await initialMessage.edit({
            content: initialMessage.content,
            components: []       // Empty array removes all components
        })

        // 2. Send outcome message
        await thread.send("Application closed - Archiving Thread. Outcome: ${reason}")

        // 3. Archive the thread
        thread.setArchived(true)

        // 4. Remove from tracking
        await openApplicationThreads.delete(threadId)
    else:
        log "Could not find Thread ${threadId}"
```

**Called from:**
- `rejectedApplicant` button handler in `interactionCreate.js` with `reason = "Rejected"`
- `addNewTrialInfoModal` submit handler in `interactionCreate.js` with `reason = "Accepted"`

---

## 10. Cross-Domain Bridge

When the **Accepted** button is clicked, the interaction routing in `interactionCreate.js`
performs these steps:

```
1. Permission check: user must have admin role
2. Show addNewTrialInfoModal (from trial-review/trialInfoModal.js)
3. On modal submit (addNewTrialInfoModal customId):
   a. Validate date via dateInputValidator regex
   b. Create trial review thread (trial-review domain)
   c. Archive application thread with reason "Accepted"
```

This is the only point where the Applications domain connects to the Trial Review domain.
The bridge is mediated through `interactionCreate.js`, not through direct function imports
in the applications code.

```
Applications Domain          interactionCreate.js         Trial Review Domain
+-----------------+          +------------------+         +------------------+
| acceptedApplicant|  --->   | shows modal      |  --->   | createTrialInfo  |
| button click     |         | addNewTrialInfo  |         |   Modal          |
+-----------------+          +------------------+         +------------------+
                                     |
                                     v
                             +------------------+
                             | modal submit     |
                             | - validate date  |
                             | - create trial   |-------> Trial Review Domain
                             |   thread         |
                             | - archive app    |-------> Applications Domain
                             |   thread         |
                             +------------------+
```

---

## 11. Slash Commands

### `/applicants create_voting_message`

**File:** `commands/applicants.js`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `thread_id` | String | Yes | Thread ID of the applicant discussion to add voting to |

**Behavior:**
1. Calls `createVotingThreadMessage(interaction.client, threadId)`.
2. If successful: replies with `"Successfully added voting message to thread Id ${threadId}"` (ephemeral).
3. If failed: replies with `"Error: Did not add voting message to thread Id ${threadId}"` (ephemeral).

**Use case:** Manual recreation of a voting message if the original was lost or corrupted.

---

## 12. Scheduled Tasks

| Task | Interval | Started By | Function |
|------|----------|------------|----------|
| Check Applications | 5 min (300,000 ms) | Called once from `ready.js`, then self-manages via internal `setInterval` | `checkApplications(client)` |
| Keep Threads Alive | 3 min (180,000 ms) | `setInterval` in `ready.js` | `keepApplicationThreadsAlive(client)` |

See [doc 12 -- Scheduled Tasks](12-scheduled-tasks.md) for the complete task registry.

---

## 13. Configuration Dependencies

| Config Key | Type | Used In | Purpose |
|------------|------|---------|---------|
| `databaseString` | String | All files | SQLite connection string |
| `applicationsCategoryId` | String | `checkApplications.js` | Discord category ID to monitor for new applications |
| `applicationsViewerChannelId` | String | `copyApplicationToViewer.js`, `createVotingThreadMessage.js`, `keepApplicationThreadAlive.js`, `archiveApplicationThread.js` | Channel where copied applications are posted |
| `applicationCloneDelay` | Number | `copyApplicationToViewer.js` | Delay in ms before copying (default: 2000) |

**Hardcoded constants:**

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `adminRoleId` | `'255630010088423425'` | `keepApplicationThreadAlive.js` | Role mentioned when thread is auto-unarchived |
| KEKW emoji ID | `'777828455735230474'` | `createVotingThreadMessage.js`, `generateVotingMessage.js` | Custom emoji for KekW against votes |
| Embed color | `0x0099FF` | `generateVotingMessage.js` | Blue color for voting embed |
| ProgressBar total | `50` | `generateVotingMessage.js` | Total units for progress bar calculation |
| ProgressBar width | `10` | `generateVotingMessage.js` | Character width of rendered bar |
| Wait before overlords | `10000` ms | `copyApplicationToViewer.js` | Delay after thread creation before adding overlords |

---

## 14. Known Quirks and Notes

1. **Loose equality in kekNo cleanup:** In `removeVoter` case 3, the `kekNo` filter uses
   `voter != userId` (loose `!=`) while all other comparisons use strict `!==` or `===`.
   This could cause unexpected behavior if user IDs were ever stored as different types.

2. **kekNo not in initial object:** When `createVotingThreadMessage` initializes the vote
   object, it does NOT include `kekNo`. The property is lazy-initialized in
   `voteKekwAgainstApplicant` and guarded with `if (!votes.kekNo)` checks throughout.

3. **openApplicationThreads value:** The `set(thread.id)` call passes only one argument,
   so the stored value is `undefined` (Keyv stores it, but the value is not meaningful).
   Only the key (thread ID) matters.

4. **First two messages concatenated:** `postApplicationMessages` concatenates
   `applicationMessages[0] + applicationMessages[1]` into a single message. Since index 1
   is typically the separator string (`~~---...---~~`), this means the main viewer channel
   message contains the first question/answer block plus a divider.

5. **suppressEmbeds on all messages:** Both the main channel message and every thread
   message have `.suppressEmbeds(true)` called to prevent Discord from generating link
   previews from any URLs in the application content.

6. **Category clear on empty:** When the applications category has zero children,
   `openApplications.clear()` wipes the entire namespace. This assumes that an empty
   category always means all applications have been handled.

7. **No auto-archive duration on thread creation:** The thread created in
   `postApplicationMessages` does not explicitly set an auto-archive duration. It relies on
   the keep-alive task (every 3 min) to set `ThreadAutoArchiveDuration.OneDay`.
