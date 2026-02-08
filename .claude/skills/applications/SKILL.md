# Applications

Guild membership application pipeline. Monitors a Discord category for new applications, copies them to a viewer channel with voting threads, and tracks votes.

## Files

- `functions/applications/checkApplications.js` — Polls every 5 min for new apps in `applicationsCategoryId`
- `functions/applications/copyApplicationToViewer.js` — Extracts embed descriptions, splits into chunks, posts to viewer channel
- `functions/applications/createVotingThreadMessage.js` — Creates voting embed with 4 buttons in a thread
- `functions/applications/voteApplicant.js` — Handles vote casting (For, Neutral, Against, KekW Against)
- `functions/applications/generateVotingMessage.js` — Renders voting progress bars and voter mentions
- `functions/applications/archiveApplicationThread.js` — Archives thread on accept/reject
- `functions/applications/keepApplicationThreadAlive.js` — Prevents single thread auto-archive
- `functions/applications/keepApplicationThreadsAlive.js` — Batch keep-alive for all open threads
- `commands/applicants.js` — Slash command definitions

## Flow

1. `checkApplications` runs every 5 min via `setInterval` (300,000 ms). Iterates guild channels looking for untracked channels in `applicationsCategoryId`. For each new application, calls `copyApplicationToViewer`.
2. `copyApplicationToViewer` fetches all messages from the application channel, extracts embed descriptions, splits on bold markdown question boundaries (`**...**`) with max 2000 chars per message. Posts to `applicationsViewerChannelId` with Accept/Reject buttons. Creates a thread from the message.
3. After a 10-second delay (`wait(10000)`), calls `addOverlordsToThread` to add officers.
4. `createVotingThreadMessage` deletes any existing vote message, creates 4 vote buttons, sends voting embed, stores initial vote data in `applicationVotes`.
5. Button clicks route through `events/interactionCreate.js` to the appropriate vote function.
6. On Accept: opens trial info modal (bridges to trial-review domain). On Reject: `archiveApplicationThread` removes buttons, sends outcome message, archives thread, cleans up DB.

## Voting System

`voteApplicant.js` exports 4 functions:
- `voteForApplicant(userId, threadId)` — adds to `forVotes`
- `voteNeutralApplicant(userId, threadId)` — adds to `neutralVotes`
- `voteAgainstApplicant(userId, threadId)` — adds to `againstVotes`
- `voteKekwAgainstApplicant(userId, threadId)` — adds to BOTH `againstVotes` AND `kekNo`

Each function removes the user from any previous vote category before adding to the new one.

`generateVotingMessage` builds an embed:
- Color: `0x0099FF`
- Title: `'🗳️ Votes 🗳️'`
- Description: `Total Votes: {n}`
- Fields: For, Neutral, Against (with KekW emojis appended)
- Progress bars via `ongoing` package (ProgressBar, width 10, `⬜`/`⬛` chars, total 50)
- Timestamp

## Thread Maintenance

`keepApplicationThreadsAlive` runs every 3 min via `setInterval`. Iterates `openApplicationThreads` namespace. For each thread:
- Sets auto-archive to `ThreadAutoArchiveDuration.OneDay`
- If archived, unarchives and pings admin role
- If thread no longer exists, deletes entry from `openApplicationThreads`

## Keyv Namespaces

| Namespace | Key | Value |
|-----------|-----|-------|
| `openApplications` | Source channel ID | Viewer thread ID |
| `openApplicationThreads` | Thread ID | (exists as set marker) |
| `applicationVotes` | Thread ID | `{ messageId, forVotes: [userId], neutralVotes: [userId], againstVotes: [userId], kekNo: [userId] }` |

## Slash Commands

### `/applicants create_voting_message`
- **Option:** `thread_id` (string, required) — Thread ID to create voting message in
- **Response:** Ephemeral success/error message

## Button Custom IDs

| Custom ID | Handler Location | Action |
|-----------|-----------------|--------|
| `acceptedApplicant` | `interactionCreate.js` | Opens trial info modal (admin-only) |
| `rejectedApplicant` | `interactionCreate.js` | Archives thread as "Rejected" (admin-only) |
| `voteFor` | `interactionCreate.js` | Calls `voteForApplicant`, updates embed |
| `voteNeutral` | `interactionCreate.js` | Calls `voteNeutralApplicant`, updates embed |
| `voteAgainst` | `interactionCreate.js` | Calls `voteAgainstApplicant`, updates embed |
| `voteKekWAgainst` | `interactionCreate.js` | Calls `voteKekwAgainstApplicant`, updates embed |

## Config Dependencies

- `databaseString` — Keyv connection string
- `applicationsCategoryId` — Discord category ID to monitor for new applications
- `applicationsViewerChannelId` — Channel where applications are copied with voting threads
- `applicationCloneDelay` — Delay in ms (default 2000) used during application copying

## Hardcoded Values

- Admin role ID: `255630010088423425` (in `keepApplicationThreadAlive.js`)
- KekW emoji ID: `777828455735230474` (in `createVotingThreadMessage.js`, `generateVotingMessage.js`)
- Admin role IDs for permission checks: `['255630010088423425', '170611904752910336']` (in `interactionCreate.js`)
