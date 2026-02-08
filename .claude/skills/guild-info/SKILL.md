# Guild Info

Manages informational embeds in the guild info channel: About Us, Schedule, Recruitment, and Achievements.

## Files

- `functions/guild-info/clearGuildInfo.js` — Deletes all messages and clears DB
- `functions/guild-info/updateAboutUs.js` — Posts About Us embed with link buttons
- `functions/guild-info/updateSchedule.js` — Posts raid schedule embed
- `functions/guild-info/updateRecruitment.js` — Posts recruitment embed with overlord mentions
- `functions/guild-info/updateAchievements.js` — Posts/updates raid progression achievements
- `commands/guildinfo.js` — Master command to refresh all sections (admin-only)
- `commands/updateAchievements.js` — Standalone achievements update (admin-only)

## Full Refresh Flow

`/guildinfo` command (admin-only, `setDefaultPermission(false)` + role permission):
1. `clearGuildInfo(interaction)` — fetches all messages in channel, deletes each individually (not bulk), clears `guildinfo` Keyv namespace
2. `updateAboutUs(interaction)` — posts embed from `data/aboutus.json`
3. `updateSchedule(interaction)` — posts embed from `data/schedule.json`
4. `updateRecruitment(interaction)` — posts embed from `data/recruitment.json`
5. `updateAchievements(interaction)` — posts achievements embed
6. If not in the guild info channel, deletes the command reply after 1 second

## Data Files

All JSON data files are in `data/`:

| File | Used By | Content |
|------|---------|---------|
| `aboutus.json` | `updateAboutUs.js` | Title, description, 3 link buttons (RaiderIO, WoWProgress, WarcraftLogs) |
| `schedule.json` | `updateSchedule.js` | Raid days and times, timezone info |
| `recruitment.json` | `updateRecruitment.js` | Recruitment fields with `{{OVERLORDS}}` template token |
| `achievements.json` | `updateAchievements.js` | Hardcoded achievement data for expansions 4-5 |

## About Us

`updateAboutUs`:
- Embed with title and description from JSON
- ActionRow with 3 link buttons (each with emoji):
  - RaiderIO profile
  - WoWProgress profile
  - WarcraftLogs profile

## Schedule

`updateSchedule`:
- Embed with 2 inline fields: Days and Times from JSON
- Footer shows timezone info

## Recruitment

`updateRecruitment`:
- Builds embed fields from JSON data
- **Template replacement:** `{{OVERLORDS}}` token in body text is replaced with Discord mentions
  - `getOverlords()` iterates `overlords` Keyv namespace
  - Formats as `<@userId>` mentions joined by ` / ` separator
- Includes "Apply Here" link button pointing to `applicationChannelUrl` from config

## Achievements

`updateAchievements`:
- **Expansions 4-5:** Uses hardcoded data from `achievements.json`, processed by `buildManualAchievements(expansion)`
- **Expansions 6+:** Uses Raider.io API:
  - `getRaidStaticData(expansion)` for raid info
  - `getRaidRankings(raid)` for guild progression
  - Loops until API returns 400 (no more expansions)
- **Calculations:**
  - Boss progression: `{killed}/{total} Mythic`
  - Cutting Edge: All bosses killed before tier end date, OR all bosses killed on current tier
  - World Ranking: from raid rankings response
- Creates/updates a single embed stored via `achievementsPostId` in `guildinfo` namespace
- If post exists, edits in place; otherwise creates new

## Keyv Namespaces

| Namespace | Key | Value |
|-----------|-----|-------|
| `guildinfo` | `achievementsPostId` | Discord message ID for achievements embed |
| `overlords` | Overlord name | Discord user ID (read-only, for recruitment mentions) |

## Slash Commands

### `/guildinfo`
- No subcommands. Runs full refresh sequence.
- **Permission:** Admin role only (`setDefaultPermission(false)` + role permission object)
- Deletes reply after 1 second if not in guild info channel.

### `/updateachievements`
- No options. Updates achievements only.
- **Permission:** Admin role only.
- Deletes reply after 1 second.

## Scheduled Tasks (from `events/ready.js`)

| Task | Interval | Function |
|------|----------|----------|
| Update achievements | 30 min (setInterval) | `updateAchievements({ client })` |

## Config Dependencies

- `databaseString` — Keyv connection string
- `guildInfoChannelId` — Channel where guild info embeds are posted
- `applicationChannelUrl` — URL for the "Apply Here" button in recruitment
- `adminRoleId` — Role ID for command permissions

## Hardcoded Values

- Raider.io guild ID for rankings: `1061585%2C43113` (in `raiderioService.js`)
- Achievement data for expansions 4-5 in `data/achievements.json`
- Expansion iteration starts at 4 in `updateAchievements`

## External APIs

- **Raider.io** — `getRaidStaticData(expansionId)` for raid info, `getRaidRankings(raid)` for guild progression
