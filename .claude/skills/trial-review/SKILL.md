# Trial Review

Manages the probation period for accepted applicants. Creates review threads with timed alerts, fetches WarcraftLogs data, and handles extensions/promotions.

## Files

- `functions/trial-review/createTrialReviewThread.js` — Creates thread, posts review message + logs, stores trial
- `functions/trial-review/trialInfoModal.js` — Discord modals for creating/updating trial info
- `functions/trial-review/dateInputValidator.js` — Validates YYYY-MM-DD format via regex
- `functions/trial-review/calculateReviewDates.js` — Calculates first (2wk) and final (4wk) review dates
- `functions/trial-review/calculateExtendedDates.js` — Calculates extension dates (7 days each beyond final)
- `functions/trial-review/generateTrialAlert.js` — Builds alert schedule array
- `functions/trial-review/generateTrialReviewContent.js` — Formats review text with Discord relative timestamps
- `functions/trial-review/generateTrialReviewMessage.js` — Builds message with content + 4 buttons
- `functions/trial-review/generateTrialLogsContent.js` — Fetches and formats WarcraftLogs links
- `functions/trial-review/getTrialLogs.js` — WarcraftLogs GraphQL API client
- `functions/trial-review/changeTrialInfo.js` — Merges partial updates into existing trial data
- `functions/trial-review/extendTrial.js` — Increments extension count, regenerates alerts
- `functions/trial-review/markToPromote.js` — Schedules promotion for next raid day
- `functions/trial-review/alertPromotions.js` — Checks and fires promotion alerts
- `functions/trial-review/checkForReviewAlerts.js` — Checks and fires review date alerts
- `functions/trial-review/alertTrialReview.js` — Sends alert message to thread
- `functions/trial-review/removeTrial.js` — Deletes trial from both `trials` and `trialAlerts`
- `functions/trial-review/getCurrentTrials.js` — Lists all active trials
- `functions/trial-review/keepTrialThreadAlive.js` — Prevents single thread auto-archive
- `functions/trial-review/keepTrialThreadsAlive.js` — Batch keep-alive for all trial threads
- `functions/trial-review/updateTrialLogs.js` — Batch refreshes logs for all trials
- `functions/trial-review/updateTrialLogsContent.js` — Refreshes single trial's logs message
- `functions/trial-review/updateTrailReviewMessages.js` — Batch updates all review messages (note: filename typo "Trail")
- `functions/trial-review/updateTrialAlerts.js` — Recalculates alert schedule for a trial
- `commands/trials.js` — Slash command definitions

## Trial Creation Flow

1. `/trials create_thread` or Accept button on application opens `createTrialInfoModal`
2. Modal collects: Character Name (3-100 chars), Role (1-300 chars), Start Date (YYYY-MM-DD, exactly 10 chars)
3. `dateInputValidator` checks format with regex: `^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$`
4. `createTrialReviewThread` sequence:
   - Sends review message (with buttons) to `trialReviewChannelId`
   - Creates thread named `"{characterName} Review"`
   - Sets auto-archive to `OneWeek`
   - Stores message ID as `trial.trialReviewId`
   - Generates and sends logs content to thread
   - Stores logs message ID as `trial.trialLogsId`
   - Pins the logs message
   - Calls `changeTrialInfo` to persist trial data (also generates alerts)
   - Adds overlords to thread

## Trial Data Shape

Stored in `trials` namespace, keyed by thread ID:
```
{
  characterName: string,
  role: string,
  startDate: string (YYYY-MM-DD),
  extended: number (0 = no extensions),
  trialReviewId: string (message ID of review message),
  trialLogsId: string (message ID of logs message)
}
```

## Review Dates

`calculateReviewDates(startDate)`:
- Sets time to **22:00 UTC** (`setHours(22)`, minutes to 0)
- First Review = start + 14 days
- Final Review = start + 28 days

`calculateExtendedDates(startDate, extended)`:
- Each extension adds 7 days from the final review date
- Extension 1 = final + 7 days, Extension 2 = final + 14 days, etc.

## Alert System

`generateTrialAlert(trial)` produces array:
```
[
  { name: "First Review", date: Date, alerted: boolean },
  { name: "Final Review", date: Date, alerted: boolean },
  { name: "Extended Review (0)", date: Date, alerted: boolean },  // if extended
  ...
]
```
`alerted` is pre-set to `true` if the date is already in the past at generation time.

`checkForReviewAlerts` (every 3 min via setInterval):
- Iterates all trials. If no alert exists yet, generates one.
- Fires when: `new Date(alert.date) < new Date() && !alert.alerted`
- Calls `alertTrialReview` which sends `<@&adminRoleId> {alertName}` to the thread
- Sets `alert.alerted = true` and saves

`alertPromotions` (every 5 min via setInterval):
- Iterates `promoteAlerts` namespace
- Fires when: `date < new Date()`
- Sends `<@&adminRoleId> Promotion time!` to thread
- Deletes the `promoteAlerts` entry after firing

## Extension

`extendTrial(threadId)`:
- Initializes `trial.extended` to 0 if missing
- Increments `trial.extended` by 1
- Regenerates entire alert array (not just appends)
- Saves updated trial + alerts to DB
- Returns updated review content string

## Promotion

`markToPromote(client, threadId)`:
- Returns `false` if already marked (thread exists in `promoteAlerts`)
- Calculates next raid day: whichever is sooner of next Sunday or next Wednesday
- Sets time to **17:30** (setHours(17), setMinutes(30))
- Stores date in `promoteAlerts` namespace
- Sends confirmation message to thread
- Returns `true`

## Partial Updates

`changeTrialInfo(client, threadId, trial)` merges partial data using nullish coalescing (`??`). Only provided fields are updated; null/undefined fields retain existing values. After merge, updates the review message, logs content, and trial alerts.

## WarcraftLogs Integration

`getTrialLogs(characterName)`:
- OAuth2 client credentials flow: POST to `https://www.warcraftlogs.com/oauth/token`
- GraphQL query to `https://www.warcraftlogs.com/api/v2/client`
- Queries guild attendance for guild ID 486913
- Filters for character with `presence === 1`
- Returns array of report codes
- `generateTrialLogsContent` formats as `https://www.warcraftlogs.com/reports/{code}`

**Endpoint Verification (Feb 2026):** Both endpoints confirmed via [WarcraftLogs API Docs](https://articles.warcraftlogs.com/help/api-documentation). Token endpoint uses `application/x-www-form-urlencoded` with `client_credentials` grant. GraphQL endpoint uses `Bearer` token auth. Public API (client credentials) is at `/api/v2/client`, user API is at `/api/v2/user`.

## Thread Maintenance

`keepTrialThreadsAlive` (every 6 min via setInterval):
- Iterates all trials
- Sets auto-archive to `ThreadAutoArchiveDuration.OneWeek`
- Unarchives if archived

## Keyv Namespaces

| Namespace | Key | Value |
|-----------|-----|-------|
| `trials` | Thread ID | Trial data object (see shape above) |
| `trialAlerts` | Thread ID | Array of `{ name, date, alerted }` |
| `promoteAlerts` | Thread ID | Promotion date (Date/ISO string) |

## Slash Commands

### `/trials create_thread`
- No options. Opens modal for trial info input.

### `/trials get_current_trials`
- No options. Returns ephemeral list of all active trials.

### `/trials remove_trial`
- **Option:** `thread_id` (string, required)
- Deletes from `trials` and `trialAlerts`.

### `/trials change_trial_info`
- **Option:** `thread_id` (string, required)
- **Option:** `character_name` (string, optional)
- **Option:** `role` (string, optional)
- **Option:** `start_date` (string, optional, YYYY-MM-DD)
- Partial update via nullish coalescing.

### `/trials update_trial_logs`
- No options. Refreshes WarcraftLogs for all trials.

### `/trials update_trial_review_messages`
- No options. Updates all review messages with current content/buttons.

## Button Custom IDs

| Custom ID | Action |
|-----------|--------|
| `updateTrialInfo` | Opens update modal (pre-fills current values) |
| `extendTrialByOneWeek` | Calls `extendTrial`, updates message content |
| `markForPromotion` | Calls `markToPromote`, updates message to "To Be Promoted" |
| `closeTrial` | Calls `removeTrial`, sends closing message, archives thread |

## Modal Custom IDs

| Custom ID | Fields |
|-----------|--------|
| `addNewTrialInfoModal` | characterNameInput (3-100), roleInput (1-300), startDateInput (10-10) |
| `updateTrialInfoModal` | Same fields, pre-filled from existing trial data |

## Scheduled Tasks (from `events/ready.js`)

| Task | Interval | Function |
|------|----------|----------|
| Check review alerts | 3 min (setInterval) | `checkForReviewAlerts(client)` |
| Check promotion alerts | 5 min (setInterval) | `alertPromotions(client)` |
| Keep threads alive | 6 min (setInterval) | `keepTrialThreadsAlive(client)` |
| Update trial logs | 60 min (setInterval) | `updateTrialLogs(client)` |

## Config Dependencies

- `databaseString` — Keyv connection string
- `trialReviewChannelId` — Channel where trial threads are created
- `warcraftLogsClientId` — OAuth2 client ID for WarcraftLogs API
- `warcraftLogsClientSecret` — OAuth2 client secret for WarcraftLogs API
- `adminRoleId` — Role ID mentioned in alerts

## Hardcoded Values

- WarcraftLogs guild ID: `486913` (in `getTrialLogs.js`)
- Admin role ID: `255630010088423425` (in `alertTrialReview.js`, `alertPromotions.js`)
- WarcraftLogs token endpoint: `https://www.warcraftlogs.com/oauth/token`
- WarcraftLogs API endpoint: `https://www.warcraftlogs.com/api/v2/client`
