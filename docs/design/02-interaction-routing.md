# 02 - Interaction Routing

The file `events/interactionCreate.js` (338 lines) is the single dispatch hub for all Discord interactions. Every button click, modal submission, select menu selection, and slash command passes through this file.

---

## Table of Contents

1. [Module Dependencies](#module-dependencies)
2. [Admin Role IDs](#admin-role-ids)
3. [Permission Check Function](#permission-check-function)
4. [Routing Flowchart](#routing-flowchart)
5. [Button CustomId Catalog](#button-customid-catalog)
6. [Loot Button Parsing](#loot-button-parsing)
7. [Modal CustomId Catalog](#modal-customid-catalog)
8. [Select Menu CustomId Catalog](#select-menu-customid-catalog)
9. [Error Handling Pattern](#error-handling-pattern)
10. [Notable Behaviors](#notable-behaviors)

---

## Module Dependencies

The file imports business logic handlers from across all domains:

```
// Trial Review
functions/trial-review/removeTrial.js         -> removeTrial
functions/trial-review/trialInfoModal.js       -> updateTrialInfoModal, createTrialInfoModal
functions/trial-review/createTrialReviewThread.js -> createTrialReviewThread
functions/trial-review/dateInputValidator.js   -> dateInputValidator
functions/trial-review/changeTrialInfo.js      -> changeTrialInfo
functions/trial-review/extendTrial.js          -> extendTrial
functions/trial-review/markToPromote.js        -> markToPromote

// Applications
functions/applications/archiveApplicationThread.js -> archiveApplicationThread
functions/applications/voteApplicant.js        -> voteForApplicant, voteNeutralApplicant,
                                                   voteAgainstApplicant, voteKekwAgainstApplicant
functions/applications/generateVotingMessage.js -> generateVotingMessage

// Loot
functions/loot/updateLootResponse.js           -> updateLootResponse

// Raids
functions/raids/updateRaiderDiscordUser.js     -> updateRaiderDiscordUser
functions/raids/ignoreCharacter.js             -> ignoreCharacter

// Utilities
util.promisify(setTimeout) -> wait

// Database
keyv (namespace: 'raiders') -- used by getRaiders() helper at bottom of file
config.json -> databaseString
```

---

## Admin Role IDs

Hardcoded at module scope (line 33):

```js
const adminRoleIds = ['255630010088423425', '170611904752910336'];
```

These are Discord role IDs. They are NOT read from `config.json` -- they are defined directly in the source file.

---

## Permission Check Function

```js
function checkPermissions(member) {
    const roles = member.roles.cache;

    let found = false;

    for (const adminRoleId of adminRoleIds) {
        if (roles.get(adminRoleId)) {
            found = true;
        }
    }

    return found;
}
```

**Input:** A Discord `GuildMember` object (from `interaction.member`).

**Algorithm:** Iterates the `adminRoleIds` array. For each ID, checks whether the member's role cache contains that role via `roles.get(adminRoleId)`. If any match is found, sets `found = true`.

**Returns:** `true` if the member holds at least one admin role, `false` otherwise.

**Note:** The loop continues checking all IDs even after finding a match (no early return).

**Used by:** `acceptedApplicant` and `rejectedApplicant` button handlers only.

---

## Routing Flowchart

```
                            +---------------------------+
                            |   interactionCreate event  |
                            +---------------------------+
                                        |
                    +-------------------+-------------------+-------------------+
                    |                   |                   |                   |
              isCommand()?        isButton()?        isModalSubmit()?   isUserSelectMenu()?
                    |                   |                   |                   |
                    v                   v                   v                   v
            +--------------+  +------------------+  +----------------+  +------------------+
            | Log user/    |  | Match customId   |  | Match customId |  | Match customId   |
            | channel      |  | (13 branches)    |  | (2 branches)   |  | (1 branch)       |
            +--------------+  +------------------+  +----------------+  +------------------+
                    |                   |                   |                   |
                    v                   |                   |                   |
            +--------------+           |                   |                   |
            | Lookup cmd   |           |                   |                   |
            | from client  |           |                   |                   |
            | .commands    |           |                   |                   |
            | Collection   |           |                   |                   |
            +--------------+           |                   |                   |
                    |                   |                   |                   |
                    v                   |                   |                   |
            +--------------+           |                   |                   |
            | cmd.execute  |           |                   |                   |
            | (interaction)|           |                   |                   |
            +--------------+           |                   |                   |
                    |                   |                   |                   |
              [try/catch]              |                   |                   |
                    |                   |                   |                   |
                    v                   v                   v                   v
               (see Error         (see Button          (see Modal         (see Select
                Handling)          Catalog)             Catalog)            Catalog)


BUTTON DISPATCH (13 branches, matched by customId):

  interaction.customId
        |
        +--[ "closeTrial" ]---------------------> removeTrial -> archive thread -> update msg
        |
        +--[ "updateTrialInfo" ]----------------> showModal(updateTrialInfoModal)
        |
        +--[ "extendTrialByOneWeek" ]-----------> extendTrial -> update msg with new content
        |
        +--[ "markForPromotion" ]---------------> markToPromote
        |                                           |
        |                                     result truthy?
        |                                      /          \
        |                                    yes           no
        |                                     |             |
        |                              update msg      reply ephemeral
        |                              with green      "Already marked
        |                              prefix          for promotion"
        |
        +--[ "acceptedApplicant" ]----> checkPermissions?
        |                                /           \
        |                              yes            no
        |                               |              |
        |                        showModal          reply ephemeral
        |                        (addNewTrial       "Insufficent
        |                         InfoModal)         permissions"
        |
        +--[ "rejectedApplicant" ]---> checkPermissions?
        |                                /           \
        |                              yes            no
        |                               |              |
        |                        archiveThread      reply ephemeral
        |                        ("Rejected")       "Insufficent
        |                        [no interaction     permissions"
        |                         reply sent]
        |
        +--[ "voteFor" ]---> voteForApplicant -> update(generateVotingMessage)
        |
        +--[ "voteNeutral" ]---> voteNeutralApplicant -> update(generateVotingMessage)
        |
        +--[ "voteAgainst" ]---> voteAgainstApplicant -> update(generateVotingMessage)
        |
        +--[ "voteKekWAgainst" ]---> voteKekwAgainstApplicant -> update(generateVotingMessage)
        |
        +--[ startsWith("updateLootResponse") ]---> parse customId via split('|')
        |                                              |
        |                                        getRaiders()
        |                                              |
        |                                     find raider by userId
        |                                        /            \
        |                                    found          not found
        |                                      |               |
        |                               updateLootResponse  reply ephemeral
        |                               -> update msg       "Could not find
        |                                                    a character name
        |                                                    linked with your
        |                                                    discord id..."
        |
        +--[ "ignore_missing_character" ]---> ignoreCharacter(characterName)
                                                  |
                                            success?
                                             /       \
                                           yes        no
                                            |          |
                                      send confirm  reply error
                                      delete msg    wait 2s
                                                    delete reply


MODAL DISPATCH (2 branches, matched by customId):

  interaction.customId
        |
        +--[ "addNewTrialInfoModal" ]---> extract 3 fields
        |                                      |
        |                              dateInputValidator(startDate)?
        |                                 /              \
        |                              valid           invalid
        |                               |                |
        |                        createTrialReview    reply "Invalid Date"
        |                        Thread               wait 1s, delete reply
        |                               |
        |                        archive application
        |                        thread (if exists)
        |                               |
        |                        reply "Successfully
        |                        created Trial Thread"
        |                        wait 1s, delete reply
        |
        +--[ "updateTrialInfoModal" ]---> extract 3 fields
                                               |
                                        changeTrialInfo(client,
                                          threadId, trial)
                                               |
                                        reply "Successfully
                                        updated Trial with
                                        thread Id ${threadId}"
                                        wait 1s, delete reply


SELECT MENU DISPATCH (1 branch, matched by customId):

  interaction.customId
        |
        +--[ "missing_user_select" ]---> updateRaiderDiscordUser(characterName, user)
                                              |
                                        success?
                                         /       \
                                       yes        no
                                        |          |
                                  send confirm  reply error
                                  delete msg    wait 2s
                                                delete reply
```

---

## Button CustomId Catalog

There are 13 distinct button handlers. The `updateLootResponse` prefix covers 4 button variants (major, minor, wantIn, wantOut) but is handled by a single branch via `startsWith()`.

| # | CustomId | Domain | Handler Function(s) | Admin Required | Response Type | Notes |
|---|----------|--------|---------------------|----------------|---------------|-------|
| 1 | `closeTrial` | Trial Review | `removeTrial`, thread `.send()`, thread `.setArchived(true)` | No | `interaction.update()` | Updates message content with `:red_square: **TRIAL ENDED** :red_square:` prefix, removes all components |
| 2 | `updateTrialInfo` | Trial Review | `updateTrialInfoModal` | No | `interaction.showModal()` | Opens modal pre-filled with current trial data if available |
| 3 | `extendTrialByOneWeek` | Trial Review | `extendTrial` | No | `interaction.update()` | Updates message content with new review dates |
| 4 | `markForPromotion` | Trial Review | `markToPromote` | No | `interaction.update()` (success) / `interaction.reply()` ephemeral (already marked) | On success: updates message with `🟩 **To Be Promoted** 🟩` prefix. On duplicate: ephemeral reply "Already marked for promotion" |
| 5 | `acceptedApplicant` | Applications | `createTrialInfoModal` | **Yes** | `interaction.showModal()` (authorized) / `interaction.reply()` ephemeral (unauthorized) | Permission failure message: "Insufficent permissions" (note: typo is in original code) |
| 6 | `rejectedApplicant` | Applications | `archiveApplicationThread` | **Yes** | None (no interaction response) / `interaction.reply()` ephemeral (unauthorized) | When authorized, calls `archiveApplicationThread(client, threadId, 'Rejected')` but does NOT send an interaction reply. Permission failure: "Insufficent permissions" |
| 7 | `voteFor` | Applications | `voteForApplicant`, `generateVotingMessage` | No | `interaction.update()` | Records a for-vote then refreshes the voting embed |
| 8 | `voteNeutral` | Applications | `voteNeutralApplicant`, `generateVotingMessage` | No | `interaction.update()` | Records a neutral-vote then refreshes the voting embed |
| 9 | `voteAgainst` | Applications | `voteAgainstApplicant`, `generateVotingMessage` | No | `interaction.update()` | Records an against-vote then refreshes the voting embed |
| 10 | `voteKekWAgainst` | Applications | `voteKekwAgainstApplicant`, `generateVotingMessage` | No | `interaction.update()` | Records an against-vote + kekNo entry, refreshes the voting embed |
| 11 | `updateLootResponse\|{type}\|{bossId}` | Loot | `updateLootResponse` | No | `interaction.update()` (success) / `interaction.reply()` ephemeral (no raider) | Validates raider exists before updating. See [Loot Button Parsing](#loot-button-parsing) |
| 12 | `ignore_missing_character` | Raids | `ignoreCharacter` | No | `channel.send()` + `message.delete()` (success) / `interaction.reply()` then delete after 2s (failure) | Character name extracted from `interaction.message.content` |
| 13 | `missing_user_select` | Raids | (handled in select menu section, not button section) | No | -- | This is actually a UserSelectMenu, listed in the select menu catalog below |

**Note:** Button #12 (`ignore_missing_character`) and the select menu (`missing_user_select`) both appear in messages posted by the missing-user alert system. Each message contains one select menu (row 1) and one button (row 2).

---

## Loot Button Parsing

The `updateLootResponse` buttons use a compound customId format with pipe (`|`) delimiters:

```
Format:  updateLootResponse|{responseType}|{bossId}
Example: updateLootResponse|major|12345
```

**Parsing logic:**

```js
const [, response, bossId] = interaction.customId.split('|');
```

The destructured array:
- Index 0: `'updateLootResponse'` (discarded via leading comma)
- Index 1: `response` -- one of `'major'`, `'minor'`, `'wantIn'`, `'wantOut'`
- Index 2: `bossId` -- the numeric boss/encounter ID as a string

**Raider validation step:**

Before updating the loot response, the handler validates that the clicking user has a linked raider character:

```js
const raidersObject = await getRaiders();
const raiderObject = raidersObject.find((o) => o.value === interaction.user.id);
if (!raiderObject) {
    await interaction.reply({
        content: `<@${interaction.user.id}> Could not find a character name linked with your discord id. Please contact an officer!`,
        ephemeral: true,
    });
}
```

The `getRaiders()` helper (defined at bottom of file) iterates the `raiders` Keyv namespace and returns an array of `{ key, value }` objects where `key` is the character name and `value` is the Discord user ID.

**Important:** If the raider is not found, the handler replies with an ephemeral error but does NOT return early -- execution continues to the `updateLootResponse` call, which may fail or produce unexpected behavior. This is a potential bug.

**Four loot button variants:**

| CustomId | Response Type | Button Label | Button Style |
|----------|---------------|--------------|--------------|
| `updateLootResponse\|major\|{bossId}` | `major` | Major | `ButtonStyle.Success` (green) |
| `updateLootResponse\|minor\|{bossId}` | `minor` | Minor | `ButtonStyle.Primary` (blue) |
| `updateLootResponse\|wantIn\|{bossId}` | `wantIn` | Want In | `ButtonStyle.Secondary` (grey) |
| `updateLootResponse\|wantOut\|{bossId}` | `wantOut` | Do not need | `ButtonStyle.Danger` (red) |

---

## Modal CustomId Catalog

Two modals are handled in the `isModalSubmit()` branch:

### addNewTrialInfoModal

| Property | Value |
|----------|-------|
| **CustomId** | `addNewTrialInfoModal` |
| **Title** | "Add New Trial Info" |
| **Domain** | Trial Review (cross-domain: triggered from Applications) |
| **Opened by** | `acceptedApplicant` button (admin-only) |

**Fields:**

| Field CustomId | Label | Style | Min Length | Max Length |
|----------------|-------|-------|------------|------------|
| `characterNameInput` | Character Name | `TextInputStyle.Short` | 3 | 100 |
| `roleInput` | Role | `TextInputStyle.Short` | 1 | 300 |
| `startDateInput` | Start Date (YYYY-MM-DD) | `TextInputStyle.Short` | 10 | 10 |

**Handler logic:**

1. Extracts three field values via `interaction.fields.getTextInputValue()`
2. Validates `startDate` with `dateInputValidator(startDate)`:
   - Regex: `^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$`
   - Returns the regex exec result (truthy if valid, null if invalid)
3. If valid:
   - Calls `createTrialReviewThread(client, { characterName, role, startDate: new Date(startDate) })`
   - If the modal was triggered from an application thread (`interaction.message?.thread?.id` exists), archives that thread with reason `'Accepted'`
   - Replies with `'Successfully created Trial Thread'`, waits 1000ms, then deletes the reply
4. If invalid:
   - Replies with `'Invalid Date'`, waits 1000ms, then deletes the reply

### updateTrialInfoModal

| Property | Value |
|----------|-------|
| **CustomId** | `updateTrialInfoModal` |
| **Title** | "Update Trial Info" |
| **Domain** | Trial Review |
| **Opened by** | `updateTrialInfo` button |

**Fields:** Same three fields as `addNewTrialInfoModal` (characterNameInput, roleInput, startDateInput) -- both modals are built by the shared `showTrialInfoModal()` function in `functions/trial-review/trialInfoModal.js`.

When opened from an existing trial's `updateTrialInfo` button, the fields are pre-filled with the current trial data from the `trials` Keyv namespace.

**Handler logic:**

1. Gets thread ID from `interaction.message.thread.id`
2. Extracts three field values
3. Builds trial object: `{ characterName, role, startDate }`
4. Calls `changeTrialInfo(client, threadId, trial)`
5. Replies with `` `Successfully updated Trial with thread Id ${threadId}` ``
6. Waits 1000ms, then deletes the reply

**Note:** Unlike `addNewTrialInfoModal`, the update modal does NOT validate the date format with `dateInputValidator`. The raw string is passed directly to `changeTrialInfo`.

---

## Select Menu CustomId Catalog

One select menu is handled in the `isUserSelectMenu()` branch:

### missing_user_select

| Property | Value |
|----------|-------|
| **CustomId** | `missing_user_select` |
| **Type** | `UserSelectMenuBuilder` |
| **Domain** | Raids |
| **Created by** | `sendAlertForRaidersWithNoUser()` in `functions/raids/` |

**Context:** When the roster sync finds a raider with no linked Discord user, it posts a message to `botSetupChannelId` containing this select menu (for an admin to pick the correct Discord user) and an "Ignore character" button.

**Handler logic:**

1. Extracts `characterName` from `interaction.message.content` (the message content is the raw character name)
2. Extracts the selected user: `interaction.values[0]`
3. Calls `updateRaiderDiscordUser(characterName, user)`:
   - Returns `true` on success (updates Keyv `raiders` namespace and regenerates `raiders.json`)
   - Returns `false` if the character name is the seed marker (`'SeriouslyCasualRaidersSeeded'`) or on error
4. If successful:
   - Sends a channel message: `` `Updated ${characterName} with <@${user}>` ``
   - Deletes the original interaction message (the one with the select menu)
5. If failed:
   - Replies: `` `Could not update raider ${characterName}` ``
   - Waits 2000ms, then deletes the reply

---

## Error Handling Pattern

### Slash Commands

Command execution is wrapped in a try/catch block:

```js
try {
    await executedCommand.execute(interaction);
}
catch (error) {
    console.error(error);
    await interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true,
    });
}
```

- Errors are logged to console via `console.error`
- The user receives an ephemeral reply with the generic message: `'There was an error while executing this command!'`
- If the command has already replied (deferred or otherwise), this `reply()` call will itself fail silently

### Buttons, Modals, and Select Menus

There is NO top-level try/catch for non-command interactions. Each handler uses individual `.catch((err) => console.error(err))` chains on async operations. This means:

- Unhandled promise rejections from button/modal/select handlers will bubble up as unhandled rejections
- Individual operation failures (e.g., a thread send failing) are caught and logged but do not prevent subsequent operations from executing
- The `wait()` + `deleteReply()` pattern used in modals has its own `.catch()` chain

### Common `.catch()` Pattern

Most async calls within handlers follow this pattern:

```js
await someOperation()
    .catch((err) => console.error(err));
```

This converts rejections into resolved `undefined` values, allowing execution to continue even if a specific operation fails.

---

## Notable Behaviors

### closeTrial Button

The update content uses Discord emoji syntax and the original message content:

```js
await interaction.update({
    content: `:red_square: **TRIAL ENDED** :red_square:\n${interaction.message}`,
    components: [],
    ephemeral: true,
});
```

- Prefixes the existing message content with `:red_square: **TRIAL ENDED** :red_square:` and a newline
- Removes all button components by setting `components: []`
- Also sends `'Closing Trial Thread'` to the thread and archives it via `thread.setArchived(true)`
- Before updating, calls `removeTrial(interaction.message.thread.id)` to clean up the trial from the database

### rejectedApplicant Button -- Missing Interaction Reply

When an authorized user clicks `rejectedApplicant`, the handler calls `archiveApplicationThread()` but never sends an interaction reply (no `interaction.update()` or `interaction.reply()`). This means Discord will show the interaction as "failed" to the user even though the operation succeeds. This is a potential UX issue.

### Loot Button -- Raider Validation Without Early Return

As noted in the loot button parsing section, if the raider lookup fails, the handler sends an ephemeral reply but does not `return`. Execution falls through to the `updateLootResponse()` call. Since `interaction.update()` is called after `interaction.reply()`, Discord may reject the second response, which would be caught by the `.catch()` chain.

### Vote Buttons -- No Permission Check

All four vote buttons (`voteFor`, `voteNeutral`, `voteAgainst`, `voteKekWAgainst`) are available to any guild member, not just admins. The voting system has no role restrictions.

### Modal Reply Cleanup Pattern

Both modals follow a "reply then delete" pattern:

```js
await interaction.reply({ content: 'Success message' });
await wait(1000);
await interaction.deleteReply();
```

This provides brief user feedback that auto-clears after 1 second. The `addNewTrialInfoModal` uses this for both success and invalid-date scenarios.

### Missing User Alert -- Message as Data Store

Both the `ignore_missing_character` button and the `missing_user_select` menu extract the character name from `interaction.message.content`. The message content IS the character name (set when the alert was originally posted). This is an implicit data contract between the alert poster and these handlers.

---

## Helper Function: getRaiders

Defined at module scope (bottom of file), outside the exported event handler:

```js
const getRaiders = async () => {
    const raidersObject = [];

    for await (const [key, value] of raiders.iterator()) {
        raidersObject.push({ key, value });
    }

    return raidersObject;
};
```

- Iterates the entire `raiders` Keyv namespace
- Returns an array of `{ key: characterName, value: discordUserId }` objects
- Used only by the `updateLootResponse` button handler for raider validation
- NOT exported -- internal to the file
