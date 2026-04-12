# 05 -- Raids and Roster Management

> Domain: Guild roster synchronization, raid signup alerts, weekly M+/vault reports, overlord management, and character ignore system.
> Files: 20 files in `functions/raids/`, 2 command files, 1 shared utility, 2 service dependencies.

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Inventory](#2-file-inventory)
3. [Data Model](#3-data-model)
4. [Roster Sync Algorithm](#4-roster-sync-algorithm)
5. [Startup Seeding](#5-startup-seeding)
6. [JSON Backup](#6-json-backup)
7. [Missing User Alerts](#7-missing-user-alerts)
8. [Signup Alert System](#8-signup-alert-system)
9. [Weekly Reports](#9-weekly-reports)
10. [Overlord Management](#10-overlord-management)
11. [Ignore System](#11-ignore-system)
12. [Individual Raider Operations](#12-individual-raider-operations)
13. [Slash Commands](#13-slash-commands)
14. [Scheduled Tasks](#14-scheduled-tasks)
15. [Service Dependencies](#15-service-dependencies)
16. [Configuration Dependencies](#16-configuration-dependencies)
17. [Known Quirks and Notes](#17-known-quirks-and-notes)

---

## 1. Overview

The raids domain maintains the guild roster by synchronizing with Raider.io, tracks which
WoW characters map to which Discord users, sends automated signup reminders before raid
days, and generates weekly M+ and Great Vault reports. It also manages "overlords" (officers
added to discussion threads) and an ignore list for characters excluded from sync.

```
+-------------------+        +-------------------+
| Raider.io API     |        | WoW Audit API     |
| (guild roster)    |        | (raid signups,    |
|                   |        |  historical data) |
+--------+----------+        +--------+----------+
         |                            |
         v                            v
+-------------------+       +--------------------+
| syncRaiders       |       | alertSignups       |
| (every 10 min)    |       | (cron: 7PM         |
| - compare stored  |       |  Mon/Tue/Fri/Sat)  |
|   vs roster       |       | - check settings   |
| - add/remove      |       | - get next raid    |
| - alert missing   |       | - find unsigned    |
|   users           |       | - send to channel  |
+--------+----------+       +--------+-----------+
         |                            |
         v                            v
+-------------------+       +--------------------+
| Keyv: raiders     |       | raidersLounge      |
| Keyv: raidersRealms       |   Channel          |
| data/raiders.json |       +--------------------+
+-------------------+

+-------------------+       +--------------------+
| Raider.io API     |       | WoW Audit API      |
| (M+ runs per      |       | (historical data   |
|  character)        |       |  per character)    |
+---------+---------+       +---------+----------+
          |                           |
          v                           v
     +---------------------------------------+
     | alertHighestMythicPlusDone             |
     | (cron: noon Wednesday)                 |
     | - M+ report (.txt file)               |
     | - Great Vault report (.txt file)      |
     +------------------+--------------------+
                        |
                        v
               +------------------+
               | weeklyCheck      |
               |   Channel        |
               +------------------+
```

---

## 2. File Inventory

| File | Exports | Purpose |
|------|---------|---------|
| `syncRaiders.js` | `syncRaiders` | Compares stored vs API roster, adds/removes raiders |
| `addRaiders.js` | `addRaiders` | Startup seed from JSON file |
| `addRaider.js` | `addRaider` | Add single raider to DB + JSON backup |
| `addRaiderRealm.js` | `addRaiderRealm` | Add single raider-realm mapping |
| `removeRaider.js` | `removeRaider` | Remove raider from DB + realm + JSON backup |
| `removeRaiderRealm.js` | `removeRaiderRealm` | Remove single raider-realm mapping |
| `updateRaider.js` | `updateRaider` | Rename raider (copy + delete) |
| `updateRaiderDiscordUser.js` | `updateRaiderDiscordUser` | Set Discord user ID for raider |
| `updateRaiderJsonData.js` | `updateRaiderJsonData` | Export all raiders to JSON file |
| `getRaiders.js` | `getRaiders` | Formatted string of all raiders with realms |
| `getStoredRaiders.js` | `getStoredRaiders` | Array of `{ name, userId }` objects |
| `getStoredRaiderRealms.js` | `getStoredRaiderRealms` | Array of `{ name, realm }` objects |
| `getOverlords.js` | `getOverlords` | Formatted string of all overlords |
| `addOverlord.js` | `addOverlord` | Add overlord to DB |
| `removeOverlord.js` | `removeOverlord` | Remove overlord from DB |
| `ignoreCharacter.js` | `ignoreCharacter`, `removeIgnoredCharacter`, `getIgnoredCharacters`, `getStoredIgnoredCharacters` | Ignore system (4 exports in one file) |
| `sendAlertForRaidersWithNoUser.js` | `sendAlertForRaidersWithNoUser` | Creates user-select menus for unlinked raiders |
| `alertSignups.js` | `alertSignups` | Signup reminder messages |
| `getCurrentSignupsForNextRaid.js` | `getCurrentSignupsForNextRaid` | Fetches next Mythic raid details from WoW Audit |
| `alertHighestMythicPlusDone.js` | `getHighestMythicPlusDoneMessage`, `getPreviousWeekMythicPlusMessage`, `getPreviousWeeklyGreatVaultMessage`, `alertHighestMythicPlusDone` | Weekly M+ and vault reports |
| `../addOverlordsToThread.js` | `addOverlordsToThread` | Shared: adds overlords to Discord threads |
| `../../commands/raiders.js` | `{ data, execute }` | `/raiders` command group (12 subcommands) |
| `../../commands/raids.js` | `{ data, execute }` | `/raids` command group (1 subcommand) |

---

## 3. Data Model

Four Keyv namespaces are owned by this domain.

### 3.1 `raiders` namespace

```
Key:   character name (string) -- WoW character name, case-preserved from Raider.io
Value: Discord user ID (string) or null (if no Discord user linked yet)
```

**Special marker key:**
```
Key:   'SeriouslyCasualRaidersSeeded'
Value: true (boolean)
```

This marker prevents re-seeding on subsequent startups. All CRUD operations guard against
accidentally modifying this marker key.

### 3.2 `raidersRealms` namespace

```
Key:   character name (string) -- matches key in raiders namespace
Value: realm name (string) -- e.g., "Silvermoon", "Ravencrest"
```

### 3.3 `overlords` namespace

```
Key:   name (string) -- officer name (human-readable, not necessarily a WoW character)
Value: Discord user ID (string)
```

### 3.4 `ignoredCharacters` namespace

```
Key:   character name (string)
Value: undefined (set with no value argument)
```

### 3.5 Cross-Namespace Relationships

```
+------------------+     character name      +-------------------+
|    raiders       | <-------- key ---------> |  raidersRealms    |
| name -> userId   |                          | name -> realm     |
+------------------+                          +-------------------+
        |
        | (excluded from sync)
        v
+------------------+
| ignoredCharacters|
| name -> (undef)  |
+------------------+

+------------------+
|    overlords     |    (independent namespace)
| name -> userId   |
+------------------+
```

---

## 4. Roster Sync Algorithm

**File:** `syncRaiders.js`
**Interval:** 10 minutes (600,000 ms) via `setInterval` in `events/ready.js`
**Data source:** Raider.io `getGuildRoster()` (filtered by rank [0, 1, 3, 4, 5, 7])

### 4.1 Complete Algorithm

```
syncRaiders(client):

    // 1. Load current state
    storedRaiders        = await getStoredRaiders()          // [{ name, userId }]
    storedCharacterNames = storedRaiders.map(s => s.name)    // preserve original case
    storedCharacterLowered = storedRaiders.map(s => s.name.toLowerCase())

    storedRaiderRealms   = await getStoredRaiderRealms()     // [{ name, realm }]
    storedRaiderRealmsLowered = storedRaiderRealms.map(s => s.name.toLowerCase())

    ignoreCharacters     = await getStoredIgnoredCharacters() // [string]

    // 2. Fetch roster from Raider.io
    wholeRoster = await getGuildRoster()
    guildRoster = wholeRoster filtered by: name NOT in ignoreCharacters

    if guildRoster is empty: return

    // 3. Build lowercase roster names for comparison
    characterNamesLowered = guildRoster.map(r => r.character.name.toLowerCase())

    // 4. Determine raiders to REMOVE
    needToRemove = storedCharacterNames
        .filter(name => !characterNamesLowered.includes(name.toLowerCase()))

    // Also remove any stored raiders that are in the ignore list
    for each character in ignoreCharacters:
        if storedCharacterNames.includes(character):
            needToRemove.push(character)

    // 5. Execute removals
    if needToRemove.length > 0:
        summaryMessage += "Removed raiders:\n"
        for each name in needToRemove:
            await removeRaider(name)   // deletes from raiders + raidersRealms + updates JSON
            summaryMessage += name + "\n"

    // 6. Determine raiders to ADD
    needToAdd = guildRoster.map(r => r.character.name)
        .filter(name => !storedCharacterLowered.includes(name.toLowerCase()))

    // 7. Execute additions
    if needToAdd.length > 0:
        summaryMessage += "Added raiders:\n"
        for each name in needToAdd:
            await addRaider(name, null)  // null userId
            summaryMessage += name + "\n"
        await sendAlertForRaidersWithNoUser(client, needToAdd)

    // 8. Post summary to botSetupChannel
    if summaryMessage.length > 0:
        await botSetupChannel.send(summaryMessage)

    // 9. Sync realms: remove stale
    needToRemoveFromRealm = storedRaiderRealms
        .filter(stored => !characterNamesLowered.includes(stored.name.toLowerCase()))
    for each toBeRemoved in needToRemoveFromRealm:
        await removeRaiderRealm(toBeRemoved.name)

    // 10. Sync realms: add new
    needToAddToRealm = guildRoster.map(r => { name, realm })
        .filter(char => !storedRaiderRealmsLowered.includes(char.name.toLowerCase()))
    for each value in needToAddToRealm:
        await addRaiderRealm(value.name, value.realm)
```

### 4.2 Sync Flow Diagram

```
Raider.io Roster                    Stored Raiders (Keyv)
(filtered by rank)                  (excluding seed marker)
        |                                   |
        v                                   v
  [A, B, C, D, E]                    [A, B, F, G]
        |                                   |
        +--- Case-insensitive diff ---------+
        |                                   |
        v                                   v
  Need to ADD: [C, D, E]           Need to REMOVE: [F, G]
  (in roster, not stored)           (stored, not in roster)
        |                                   |
        v                                   v
  addRaider(name, null)             removeRaider(name)
  sendAlertForRaidersWithNoUser     (deletes from raiders +
                                     raidersRealms + JSON)
```

### 4.3 Case-Insensitive Comparison

All name comparisons are done by lowercasing both sides:
- `storedCharacterLowered` = stored names lowered
- `characterNamesLowered` = roster names lowered
- Filtering uses `.includes(name.toLowerCase())`

This prevents duplicates from case mismatches between Raider.io and stored data.

### 4.4 Ignored Characters During Sync

Ignored characters are handled in two places:
1. **Filtered FROM roster:** `wholeRoster.filter(r => !ignoreCharacters.includes(r.character.name))`
2. **Added TO removal list:** If an ignored character still exists in stored raiders, it is explicitly added to `needToRemove`.

This ensures that newly-ignored characters are removed on the next sync cycle.

---

## 5. Startup Seeding

**File:** `addRaiders.js`
**Called:** Once from `events/ready.js` as `addRaiders(false, false)`

```
addRaiders(override = false, useSeedData = false):

    seededKey = 'SeriouslyCasualRaidersSeeded'
    seeded = await raiders.get(seededKey)

    if override OR !seeded:
        // Clear entire raiders namespace
        await raiders.clear()

        // Load data source
        if useSeedData:
            raidersJson = require('data/raidersSeedData.json')
        else:
            try:
                raidersJson = require('data/${config.raiderJson}')  // e.g., 'raiders.json'
            catch:
                raidersJson = require('data/raidersSeedData.json')  // fallback

        // Seed each raider
        for each raiderSeedData in raidersJson:
            await raiders.set(raiderSeedData.name, raiderSeedData.userId)

        // Set seeded marker
        await raiders.set(seededKey, true)

        // Export to JSON
        await updateRaiderJsonData()
        return

    throw 'Did not seed raiders: Already seeded'
```

### 5.1 JSON Fallback Chain

```
1. Try: data/${config.raiderJson}     (typically "raiders.json")
2. Catch: data/raidersSeedData.json    (static seed file)
```

On first deploy, `raiders.json` may not exist yet, so the seed data is used. After the
first sync cycle, `updateRaiderJsonData()` creates/updates `raiders.json`.

### 5.2 Data Format

Both JSON files use the same format:

```json
[
    { "name": "CharacterName", "userId": "123456789012345678" },
    { "name": "AnotherChar",   "userId": null }
]
```

---

## 6. JSON Backup

**File:** `updateRaiderJsonData.js`

```
updateRaiderJsonData():
    raidersObject = []

    for await (const [key, value] of raiders.iterator()):
        raidersObject.push({ name: key, userId: value })

    json = JSON.stringify(raidersObject, null, 2)

    fs.writeFile('./data/${config.raiderJson}', json, callback)
```

**Called by:** `addRaider`, `removeRaider`, `updateRaider`, `updateRaiderDiscordUser`, `addRaiders`

**Note:** This includes the `SeriouslyCasualRaidersSeeded` marker in the exported JSON
since the iterator yields all keys. When re-imported, this marker key gets stored as a
raider with `userId: true`, but the seed marker is immediately re-set to `true` afterward.

---

## 7. Missing User Alerts

**File:** `sendAlertForRaidersWithNoUser.js`

```
sendAlertForRaidersWithNoUser(client, missingUser?):

    // If no specific list provided, find all raiders with null userId
    if !missingUser:
        storedRaiders = await getStoredRaiders()
        missingUser = storedRaiders
            .filter(s => s.userId === null)
            .map(s => s.name)

    if missingUser.length > 0:
        channel = await client.channels.fetch(config.botSetupChannelId)

        for each missing in missingUser:
            // Row 1: User select menu
            firstRow = ActionRowBuilder with:
                UserSelectMenuBuilder:
                    customId:    'missing_user_select'
                    placeholder: 'Select user for ${missing}'
                    minValues:   1
                    maxValues:   1

            // Row 2: Ignore button
            secondRow = ActionRowBuilder with:
                ButtonBuilder:
                    customId: 'ignore_missing_character'
                    label:    'Ignore character'
                    style:    ButtonStyle.Danger

            // Send and pin
            message = await channel.send({
                content: missing,       // Just the character name as content
                components: [firstRow, secondRow]
            })
            await message.pin()
```

### 7.1 Component Layout

```
+------------------------------------------+
| CharacterName                            |
|                                          |
| [v Select user for CharacterName      ]  |  <-- UserSelectMenuBuilder
|                                          |
| [ Ignore character ]                     |  <-- ButtonBuilder (Danger/red)
+------------------------------------------+
  [Pinned]
```

### 7.2 Interaction Handling (in interactionCreate.js)

**User select menu (`missing_user_select`):**
```
characterName = interaction.message.content
selectedUser  = interaction.values[0]
await updateRaiderDiscordUser(characterName, selectedUser)
reply "Updated ${characterName} with ${selectedUser}" (ephemeral)
```

**Button (`ignore_missing_character`):**
```
characterName = interaction.message.content
await ignoreCharacter(characterName)
await interaction.message.delete()
reply "${characterName} will be ignored" (ephemeral)
```

---

## 8. Signup Alert System

**File:** `alertSignups.js`
**Scheduled:** node-cron `0 19 * * 1,2,5,6` (7:00 PM on Monday, Tuesday, Friday, Saturday)

### 8.1 Day-of-Week Logic

```
alertSignups(client):
    today      = new Date()
    getTodayDoW = today.getDay()
    nextRaidDay = new Date()
    twoDayReminder = false

    switch (getTodayDoW):
        case 1 (Monday):
            twoDayReminder = true
            nextRaidDay.setDate(today.getDate() + 2)     // Wednesday
            setting = await getSettings('alertSignup_Wednesday_48')
            if !setting: return                           // Disabled

        case 2 (Tuesday):
            nextRaidDay.setDate(today.getDate() + 1)     // Wednesday
            setting = await getSettings('alertSignup_Wednesday')
            if !setting: return

        case 5 (Friday):
            twoDayReminder = true
            nextRaidDay.setDate(today.getDate() + 2)     // Sunday
            setting = await getSettings('alertSignup_Sunday_48')
            if !setting: return

        case 6 (Saturday):
            nextRaidDay.setDate(today.getDate() + 1)     // Sunday
            setting = await getSettings('alertSignup_Sunday')
            if !setting: return

        default: break  // No action on other days

    nextRaidDay.setHours(19, 0, 0)  // Raid time: 7:00 PM
```

### 8.2 Settings Integration

| Day | Setting Key | Reminder Type |
|-----|------------|---------------|
| Monday (1) | `alertSignup_Wednesday_48` | 48-hour reminder for Wednesday |
| Tuesday (2) | `alertSignup_Wednesday` | 24-hour reminder for Wednesday |
| Friday (5) | `alertSignup_Sunday_48` | 48-hour reminder for Sunday |
| Saturday (6) | `alertSignup_Sunday` | 24-hour reminder for Sunday |

Each setting is a boolean in the `settings` Keyv namespace. If the setting is `false`
(or not set, defaulting to `false`), the alert is skipped entirely.

### 8.3 Next Raid Lookup

**File:** `getCurrentSignupsForNextRaid.js`

```
getCurrentSignupsForNextRaid() -> { id, date, signups } | null:

    upcomingRaids = await wowauditService.getUpcomingRaids()

    // Sort by date ascending
    upcomingRaids.sort((a, b) => new Date(a.date) > new Date(b.date))

    // Filter: Mythic difficulty AND Planned status
    upcomingRaids = upcomingRaids.filter(
        raid => raid.difficulty === 'Mythic' && raid.status === 'Planned'
    )

    nextRaid = upcomingRaids[0]  // First matching raid

    nextRaidDetailed = await wowauditService.getRaidDetails(nextRaid.id)

    return {
        id:      nextRaid.id,
        date:    nextRaid.date,        // "YYYY-MM-DD" string
        signups: nextRaidDetailed.signups.map(x => ({
            name:   x.character.name,
            status: x.status
        }))
    }
```

### 8.4 Unsigned Raider Detection

```
    nextRaidDayString = nextRaidDay.toISOString().split('T')[0]  // "YYYY-MM-DD"

    // Guard: nextRaid must match the expected date
    if nextRaid AND nextRaidDay !== today AND nextRaidDayString === nextRaid.date:

        // Filter for Unknown status (not signed)
        notSignedRaiders = nextRaid.signups.filter(
            signup => signup.status === 'Unknown'
        )

        // Resolve Discord user IDs
        notSignedUsers = await Promise.all(
            notSignedRaiders.map(async raider => {
                userId = await raiders.get(raider.name)
                if !userId: return raider.name      // Fall back to character name
                return userId
            })
        )

        // Deduplicate (same user may have multiple characters)
        distinctNotSignedUsers = notSignedUsers.filter(
            (value, index, self) => self.indexOf(value) === index
        )
```

### 8.5 Message Construction

```
    if notSignedUsers.length > 0:
        message = ''

        // 48-hour reminders include relative timer
        if twoDayReminder:
            deadlineDate = nextRaidDay - 1 day (in ms)
            timer = Math.floor(deadlineDate / 1000)
            message += 'Sign up for the next raid!\n'
            message += '[<t:${timer}:R>]\n\n'

        // List unsigned users
        for each user in distinctNotSignedUsers:
            if user is numeric (Discord ID):
                message += '<@${user}>\n'       // Discord mention
            else:
                message += '${user}\n'           // Plain character name

        // Random quip from 64 options
        messageIndex = Math.floor(Math.random() * signupAlertMessages.messages.length)
        message += '\n ${signupAlertMessages.messages[messageIndex]}'

        // Channel link + WoW Audit link
        message += '\n\n <#980016906620776528> / https://wowaudit.com/eu/silvermoon/seriouslycasual/main/raids/${nextRaid.id}'

    // If no unsigned users found
    if !foundUser:
        if twoDayReminder:
            message = ''                         // Silent: skip 48hr if all signed
        else:
            message = 'party Everyone has signed for the next raid party'

    // Send to raiders lounge channel
    if message !== '':
        raidersLoungeChannel = await client.channels.fetch(config.raidersLoungeChannelId)
        await raidersLoungeChannel.send(message)
```

### 8.6 Signup Alert Messages

**File:** `data/signupAlertMessages.json`

```json
{
    "messages": [
        "Shame... bell Shame... bell Shame... bell",
        "Oi, sign up innit?",
        "Dear Sir/Madam, please sign up for the next raid.",
        ... (64 total messages)
    ]
}
```

Messages include a mix of hand-written quips and OpenAI-generated quips (marked with
`*[Quip generated by OpenAI]*`). Selection is random via `Math.floor(Math.random() * length)`.

### 8.7 Hardcoded Channel

The signup alert message includes a hardcoded channel mention:
```
<#980016906620776528>
```
This is embedded directly in the message string, not read from config.

---

## 9. Weekly Reports

**File:** `alertHighestMythicPlusDone.js`
**Scheduled:** node-cron `0 12 * * 3` (noon on Wednesday)

### 9.1 Report Orchestration

```
alertHighestMythicPlusDone(client):
    weeklyCheckChannel = await client.channels.fetch(config.weeklyCheckChannelId)

    // Fetch historical data once (used by both reports)
    data = await wowauditService.getHistoricalData()

    // Send M+ report
    await weeklyCheckChannel.send(await getPreviousWeekMythicPlusMessage(data))

    // Send Great Vault report
    await weeklyCheckChannel.send(await getPreviousWeeklyGreatVaultMessage(data))
```

Both reports are sent as `.txt` file attachments using Node.js `Buffer`.

### 9.2 M+ Report (Raider.io Source)

```
getHighestMythicPlusDoneMessage() -> { content, files }:

    content = ''

    for await (const [key] of raiders.iterator()):
        if key !== 'SeriouslyCasualRaidersSeeded':
            realm = await raidersRealms.get(key)

            result = await raiderioService.getPreviousWeeklyHighestMythicPlusRun(
                'eu', realm, key
            )

            runs = result.mythic_plus_previous_weekly_highest_level_runs
                ?.map(r => r.mythic_level)

            if runs is undefined: runs = 'Error'
            if runs.length === 0: runs = 'None'

            content += '${key}: [${runs}]\n'

    return {
        content: 'Highest Mythic+ Runs last week',
        files: [{
            attachment: Buffer.from(content, 'utf-8'),
            name: 'highest_mythicplus_${today.toISOString()}.txt',
            description: 'Mythic+ done by raiders last week'
        }]
    }
```

**Sample output (txt file):**
```
Exampletoon: [15,14,12,11]
AnotherChar: [10,8]
LazyPlayer: None
BrokenApi: Error
```

### 9.3 M+ Report (WoW Audit Source)

```
getPreviousWeekMythicPlusMessage(historicData?) -> { content, files }:

    if !historicData:
        historicData = await wowauditService.getHistoricalData()

    dungeonsDone = historicData.map(character => ({
        characterName: character.name,
        dungeonsDone:  character.data?.dungeons_done
            ?.map(d => Number(d.level))
            .sort((a, b) => a - b)
            .reverse()          // Highest first
            ?? null
    }))

    // Sort alphabetically by character name (case-insensitive)
    dungeonsDone.sort(by characterName.toUpperCase())

    content = ''
    for each character in dungeonsDone:
        dungeons = character.dungeonsDone?.join(',') ?? 'No Data'
        content += '${character.characterName}: [${dungeons}]\n'

    return {
        content: 'Highest Mythic+ Runs last week',
        files: [{
            attachment: Buffer.from(content, 'utf-8'),
            name: 'highest_mythicplus_${today.toISOString()}.txt',
            description: 'Mythic+ done by raiders last week'
        }]
    }
```

### 9.4 Great Vault Report

```
getPreviousWeeklyGreatVaultMessage(historicData?) -> { content, files }:

    if !historicData:
        historicData = await wowauditService.getHistoricalData()

    greatVault = historicData.map(character => ({
        characterName: character.name,
        greatVault:    character.data?.vault_options ?? null
    }))

    // Sort alphabetically
    greatVault.sort(by characterName.toUpperCase())

    // Calculate column width from longest character name
    longestCharacter = max(greatVault, by characterName.length).characterName.length

    // Header
    content  = '${pad("", longest)}| ${pad("Raid", 16)} | ${pad("Dungeon", 16)} | ${pad("World", 16)}\n'
    content += '-'.repeat(content.length) + '\n'

    // Data rows
    for each character in greatVault:
        raids    = character.greatVault?.raids    ?? null
        dungeons = character.greatVault?.dungeons ?? null
        world    = character.greatVault?.world    ?? null

        raidOptions    = raids    ? '${pad(opt1,4)}/ ${pad(opt2,4)}/ ${pad(opt3,4)}' : 'No Data'
        dungeonOptions = dungeons ? '${pad(opt1,4)}/ ${pad(opt2,4)}/ ${pad(opt3,4)}' : 'No Data'
        worldOptions   = world    ? '${pad(opt1,4)}/ ${pad(opt2,4)}/ ${pad(opt3,4)}' : 'No Data'

        content += '${pad(characterName, longest)}| '
        content += '${pad(raidOptions, 16)} | '
        content += '${pad(dungeonOptions, 16)} | '
        content += '${pad(worldOptions, 16)}\n'

    return {
        content: 'Great Vaults last week',
        files: [{
            attachment: Buffer.from(content, 'utf-8'),
            name: 'great_vaults_${today.toISOString()}.txt',
            description: 'Raiders Great Vaults last week'
        }]
    }
```

### 9.5 Column Formatting

```
formatColumn(value, length) -> string:
    spacesNeeded = length - value.toString().length
    result = value + ' '.repeat(spacesNeeded)
    return result
```

**Sample vault output (txt file):**
```
              | Raid             | Dungeon          | World
---------------------------------------------------------------------------
Exampletoon   | 616 / 616 / 610 | 12  / 11  / 10  | 8   / 8   / 8
AnotherChar   | No Data          | 10  / 9   /     | No Data
```

Each vault option is a numeric value (item level or key level), padded to 4 characters.
The `??` operator handles missing options with empty strings.

---

## 10. Overlord Management

Overlords are guild officers who are automatically added to application and trial review
threads.

### 10.1 CRUD Operations

**File:** `addOverlord.js`
```
addOverlord(name, userId) -> boolean:
    return await overlords.set(name, userId)  // returns true on success
```

**File:** `removeOverlord.js`
```
removeOverlord(name) -> boolean:
    return await overlords.delete(name)       // returns true on success
```

**File:** `getOverlords.js`
```
getOverlords() -> string:
    result = ''
    for await (const [key, value] of overlords.iterator()):
        result += '${key} (${value})\n'
    return result
```

### 10.2 Thread Integration

**File:** `functions/addOverlordsToThread.js` (shared utility)

```
addOverlordsToThread(thread):
    for await (const [, userId] of overlords.iterator()):
        await thread.members.add(userId)
```

**Used by:**
- `copyApplicationToViewer` (applications domain) -- after 10-second delay
- `createTrialReviewThread` (trial-review domain) -- immediately after thread setup

---

## 11. Ignore System

**File:** `ignoreCharacter.js` (4 exports in one file)

### 11.1 Operations

```
ignoreCharacter(name) -> boolean:
    await removeRaider(name)                     // Remove from raiders + realm + JSON
    return await ignoredCharacters.set(name)     // Add to ignore list (no value)

removeIgnoredCharacter(name) -> boolean:
    return await ignoredCharacters.delete(name)

getIgnoredCharacters() -> string:
    // Formatted string for display
    result = ''
    for await (const [key] of ignoredCharacters.iterator()):
        result += '${key}\n'
    return result

getStoredIgnoredCharacters() -> string[]:
    // Array for programmatic use
    raidersObject = []
    for await (const [key] of ignoredCharacters.iterator()):
        raidersObject.push(key)
    return raidersObject
```

### 11.2 Ignore Flow

```
1. User clicks "Ignore character" button on missing-user alert
   OR runs /raiders ignore_character command
2. ignoreCharacter(name) called:
   a. removeRaider(name) -- deletes from raiders + raidersRealms + updates JSON
   b. ignoredCharacters.set(name) -- adds to ignore list
3. Next syncRaiders cycle:
   a. wholeRoster filtered to exclude ignored characters
   b. Any stored raiders matching ignore list added to removal list
   c. Character stays ignored across syncs
```

---

## 12. Individual Raider Operations

### 12.1 Add Raider

**File:** `addRaider.js`
```
addRaider(name, userId) -> boolean:
    if name === 'SeriouslyCasualRaidersSeeded': return false  // guard
    await raiders.set(name, userId)
    await updateRaiderJsonData()   // export to JSON
    return true
```

### 12.2 Remove Raider

**File:** `removeRaider.js`
```
removeRaider(name) -> boolean:
    if name === 'SeriouslyCasualRaidersSeeded': return false  // guard
    await raiders.delete(name)
    await removeRaiderRealm(name)  // also delete realm mapping
    await updateRaiderJsonData()   // export to JSON
    return true
```

### 12.3 Add/Remove Raider Realm

**Files:** `addRaiderRealm.js`, `removeRaiderRealm.js`
```
addRaiderRealm(name, realm) -> boolean:
    if name === 'SeriouslyCasualRaidersSeeded': return false
    return await raidersRealms.set(name, realm)

removeRaiderRealm(name) -> boolean:
    if name === 'SeriouslyCasualRaidersSeeded': return false
    return await raidersRealms.delete(name)
```

### 12.4 Update Raider (Rename)

**File:** `updateRaider.js`
```
updateRaider(previousName, newName) -> boolean:
    if previousName === 'SeriouslyCasualRaidersSeeded': return false
    raider = await raiders.get(previousName)
    if raider:
        await Promise.all([
            raiders.set(newName, raider),
            raiders.delete(previousName)
        ])
        await updateRaiderJsonData()
        return true
    return false
```

### 12.5 Update Discord User

**File:** `updateRaiderDiscordUser.js`
```
updateRaiderDiscordUser(name, userId) -> boolean:
    if name === 'SeriouslyCasualRaidersSeeded': return false
    await raiders.set(name, userId)
    await updateRaiderJsonData()
    return true
```

### 12.6 Query Operations

**File:** `getRaiders.js`
```
getRaiders() -> string:
    // Format: "CharName RealmName (userId)\n"
    for await (const [key, value] of raiders.iterator()):
        if key !== 'SeriouslyCasualRaidersSeeded':
            realm = await raidersRealms.get(key)
            result += '${key} ${realm} (${value})\n'
    return result
```

**File:** `getStoredRaiders.js`
```
getStoredRaiders() -> Array<{ name: string, userId: string }>:
    for await (const [key, value] of raiders.iterator()):
        if key !== 'SeriouslyCasualRaidersSeeded':
            raidersObject.push({ name: key, userId: value })
    return raidersObject
```

**File:** `getStoredRaiderRealms.js`
```
getStoredRaiderRealms() -> Array<{ name: string, realm: string }>:
    for await (const [key, value] of raidersRealms.iterator()):
        if key !== 'SeriouslyCasualRaidersSeeded':
            raidersObject.push({ name: key, realm: value })
    return raidersObject
```

**Note:** All query functions filter out `SeriouslyCasualRaidersSeeded` from results.

---

## 13. Slash Commands

### 13.1 `/raiders` Command Group (12 Subcommands)

**File:** `commands/raiders.js`

| Subcommand | Parameters | Response | Behavior |
|------------|-----------|----------|----------|
| `get_raiders` | None | Ephemeral | Returns formatted raider list via `getRaiders()` |
| `get_ignored_characters` | None | Ephemeral | Returns formatted ignore list via `getIgnoredCharacters()` |
| `ignore_character` | `character_name` (string, required) | Ephemeral | Calls `ignoreCharacter(name)`, success/error |
| `remove_ignore_character` | `character_name` (string, required) | Ephemeral | Calls `removeIgnoredCharacter(name)`, success/error |
| `sync_raiders` | None | Ephemeral | Calls `syncRaiders(client)`, then replies with raider list |
| `check_missing_users` | None | Ephemeral | Calls `sendAlertForRaidersWithNoUser(client)`, replies "Success!" |
| `update_raider_user` | `character_name` (string, required), `user` (User, required) | Ephemeral | Calls `updateRaiderDiscordUser(name, user.id)` |
| `previous_highest_mythicplus` | None | Public | Replies "Retrieving runs...", fetches `getHistoricalData()`, edits reply with M+ file |
| `previous_great_vault` | None | Public | Replies "Retrieving runs...", fetches `getHistoricalData()`, edits reply with vault file |
| `add_overlord` | `name` (string, required), `user` (User, required) | Ephemeral | Calls `addOverlord(name, user.id)` |
| `get_overlords` | None | Ephemeral | Returns formatted overlord list via `getOverlords()` |
| `remove_overlord` | `name` (string, required) | Ephemeral | Calls `removeOverlord(name)` |

**Bug:** The `remove_overlord` subcommand is registered in `SlashCommandBuilder` as
`remove_overlord` (singular) but the handler in `execute()` checks for
`interaction.options.getSubcommand() === 'remove_overlords'` (plural). This means the
subcommand will never match in the handler, and the overlord will never be removed via
this command.

### 13.2 `/raids` Command Group (1 Subcommand)

**File:** `commands/raids.js`

| Subcommand | Parameters | Response | Behavior |
|------------|-----------|----------|----------|
| `alert_signups` | None | Ephemeral | Calls `alertSignups(client)`, replies success or error |

---

## 14. Scheduled Tasks

| Task | Type | Schedule | Function | Error Handling |
|------|------|----------|----------|----------------|
| Sync Raiders | setInterval | 10 min (600,000 ms) | `syncRaiders(client)` | try/catch, console.log |
| Alert Signups | node-cron | `0 19 * * 1,2,5,6` (7PM Mon/Tue/Fri/Sat) | `alertSignups(client)` | **None** |
| M+ & Vault Reports | node-cron | `0 12 * * 3` (noon Wednesday) | `alertHighestMythicPlusDone(client)` | **None** |
| Seed Raiders | Startup-only | Once on ready event | `addRaiders(false, false)` | try/catch (throws on re-seed) |

See [doc 12 -- Scheduled Tasks](12-scheduled-tasks.md) for the complete task registry.

---

## 15. Service Dependencies

### 15.1 Raider.io Service

**File:** `services/raiderioService.js`

| Function | Used By | Purpose |
|----------|---------|---------|
| `getGuildRoster()` | `syncRaiders` | EU-Silvermoon roster, filtered to ranks [0,1,3,4,5,7] |
| `getPreviousWeeklyHighestMythicPlusRun(region, realm, name)` | `getHighestMythicPlusDoneMessage` | Per-character M+ data |

**Guild roster URL:**
```
https://raider.io/api/v1/guilds/profile?region=eu&realm=silvermoon&name=seriouslycasual&fields=members
```

**Rank filter:** `[0, 1, 3, 4, 5, 7]` -- specific guild ranks representing raider roles.

**Roster response shape:**
```
response.data.members = [
    {
        rank: number,
        character: {
            name: string,
            realm: string,
            ...
        }
    },
    ...
]
```

### 15.2 WoW Audit Service

**File:** `services/wowauditService.js`

| Function | Used By | Purpose |
|----------|---------|---------|
| `getUpcomingRaids()` | `getCurrentSignupsForNextRaid` | List of upcoming raids |
| `getRaidDetails(id)` | `getCurrentSignupsForNextRaid` | Signup details for a specific raid |
| `getHistoricalData()` | `alertHighestMythicPlusDone`, `/raiders previous_*` | Previous period character data |

**Note:** `getRaidDetails` has a bug in the URL: an extra `}` character:
```javascript
`https://wowaudit.com/v1/raids/${id}}`
//                                   ^ extra closing brace
```

**getHistoricalData internals:**
```
1. getCurrentPeriod() -> current_period (number)
2. previousPeriod = +currentPeriod - 1
3. GET /v1/historical_data?period=${previousPeriod}
4. return response.characters
```

---

## 16. Configuration Dependencies

| Config Key | Type | Used In | Purpose |
|------------|------|---------|---------|
| `databaseString` | String | All files | SQLite connection |
| `botSetupChannelId` | String | `syncRaiders.js`, `sendAlertForRaidersWithNoUser.js` | Channel for sync summaries and missing-user alerts |
| `raidersLoungeChannelId` | String | `alertSignups.js` | Channel for signup alert messages |
| `weeklyCheckChannelId` | String | `alertHighestMythicPlusDone.js` | Channel for weekly M+/vault reports |
| `raiderJson` | String | `addRaiders.js`, `updateRaiderJsonData.js` | Filename for raider JSON (e.g., "raiders.json") |
| `wowAuditApiSecret` | String | `services/wowauditService.js` | WoW Audit API authentication |

**Hardcoded constants:**

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| Channel mention | `<#980016906620776528>` | `alertSignups.js` | Hardcoded in signup alert message |
| WoW Audit URL | `https://wowaudit.com/eu/silvermoon/seriouslycasual/main/raids/` | `alertSignups.js` | Appended with raid ID |
| Raider.io guild | `eu/silvermoon/seriouslycasual` | `services/raiderioService.js` | Hardcoded in roster URL |
| Raider.io ranks | `[0, 1, 3, 4, 5, 7]` | `services/raiderioService.js` | Guild ranks to include |
| Seed marker key | `'SeriouslyCasualRaidersSeeded'` | `addRaiders.js`, all query functions | Prevents re-seeding |
| Raid time | `19:00` | `alertSignups.js` | `nextRaidDay.setHours(19, 0, 0)` |

---

## 17. Known Quirks and Notes

1. **remove_overlord/remove_overlords bug:** The slash command registers the subcommand as
   `remove_overlord` but the handler checks for `remove_overlords`. Since
   `getSubcommand()` returns the registered name, the handler condition never matches,
   making this subcommand non-functional.

2. **Seed marker in JSON export:** `updateRaiderJsonData` iterates ALL keys in the raiders
   namespace, including `SeriouslyCasualRaidersSeeded`. This means the JSON backup file
   contains an entry like `{ "name": "SeriouslyCasualRaidersSeeded", "userId": true }`.

3. **Realm sync uses forEach with async:** In `syncRaiders.js` lines 76-87, realm
   additions and removals use `.forEach(async ...)` which does not properly await the
   async operations. This means realm operations may execute in unpredictable order or
   not complete before the function returns.

4. **Sort comparison in getCurrentSignupsForNextRaid:** The sort uses
   `(a, b) => new Date(a.date) > new Date(b.date)` which returns a boolean, not a number.
   JavaScript's `Array.sort` expects -1/0/1 return values. This may produce incorrect
   sort order in some engines.

5. **WoW Audit getRaidDetails URL bug:** The URL template has an extra closing brace:
   `` `https://wowaudit.com/v1/raids/${id}}` ``. This appends a literal `}` to the URL,
   though the API may ignore it.

6. **ignoreCharacter.set with no value:** `ignoredCharacters.set(name)` is called without
   a second argument, storing `undefined` as the value. Only the key matters for this
   namespace.

7. **Two M+ report functions:** There are two separate M+ report generators:
   - `getHighestMythicPlusDoneMessage` uses Raider.io (per-character API calls)
   - `getPreviousWeekMythicPlusMessage` uses WoW Audit historical data
   Both are available, but `alertHighestMythicPlusDone` (the scheduled task) uses only the
   WoW Audit versions. The Raider.io version (`getHighestMythicPlusDoneMessage`) is
   exported but not called by any automated task.

8. **No error handling on cron tasks:** Both `alertSignups` and
   `alertHighestMythicPlusDone` are registered as node-cron tasks without try/catch
   wrappers in `ready.js`. Unhandled errors will only appear in the process error handler.

9. **Date.prototype.getWeekNumber:** The file `alertHighestMythicPlusDone.js` adds a
   `getWeekNumber()` method to `Date.prototype`, but it is never called anywhere in the
   codebase. This is dead code that mutates a global prototype.

10. **48-hour reminder suppression:** When everyone has signed up on a 48-hour reminder day
    (Monday or Friday), the message is set to empty string and nothing is sent. On 24-hour
    days (Tuesday or Saturday), the "Everyone has signed" celebration message is sent
    instead.
