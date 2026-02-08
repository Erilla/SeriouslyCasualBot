# Services (Overview)

External API wrappers located in `services/`. Detailed documentation for each service is in its own skill file.

| Service | Skill File | Auth | HTTP Client | Status | Endpoints Verified |
|---------|-----------|------|-------------|--------|-------------------|
| Raider.io | `.claude/skills/raiderio-service/SKILL.md` | None | axios | Active | All 4 verified |
| WoW Audit | `.claude/skills/wowaudit-service/SKILL.md` | API secret header | node-fetch | Active | Unverifiable (no public docs) |
| EPGP | `.claude/skills/epgp-service/SKILL.md` | None | axios | Active | All 3 verified |
| Battle.net | `.claude/skills/battlenet-service/SKILL.md` | OAuth2 | node-fetch | Deprecated | Known valid (Blizzard docs) |

## Domain Usage Map

| Service | Domains That Use It |
|---------|-------------------|
| Raider.io | Raids (roster sync, M+ runs), Loot (raid discovery), Guild Info (achievements) |
| WoW Audit | Raids (signup alerts, M+ reports, vault reports) |
| EPGP | EPGP (priority rankings) |
| Battle.net | None (deprecated, replaced by Raider.io for roster) |

## WarcraftLogs (No Service File)

WarcraftLogs OAuth2 + GraphQL integration is handled directly in `functions/trial-review/getTrialLogs.js`, not in a service file. See `.claude/skills/trial-review/SKILL.md` for details. Both endpoints verified via [official API docs](https://articles.warcraftlogs.com/help/api-documentation).

## Shared Utility

### `functions/addOverlordsToThread.js`

Not a service, but a shared utility used by both applications and trial-review domains.

- Iterates all entries in `overlords` Keyv namespace
- Adds each user to the provided Discord thread via `thread.members.add(userId)`
- Called after thread creation in both `copyApplicationToViewer` and `createTrialReviewThread`

## Config Dependencies

| Config Key | Service | Purpose |
|------------|---------|---------|
| `wowAuditApiSecret` | WoW Audit | Authorization header value |
| `warcraftLogsClientId` | WarcraftLogs (in trial-review) | OAuth2 client ID |
| `warcraftLogsClientSecret` | WarcraftLogs (in trial-review) | OAuth2 client secret |
| `bnetClientId` | Battle.net (deprecated) | OAuth2 client ID |
| `bnetClientSecret` | Battle.net (deprecated) | OAuth2 client secret |

## Error Handling Patterns

Services use two different patterns:

**Raider.io + EPGP (axios):** Return the error object as resolved value. Callers must check return type.
```javascript
.catch((error) => error)  // error returned, not thrown
```

**WoW Audit (node-fetch):** Log error to console, return `undefined`.
```javascript
.catch((err) => console.error(err))  // returns undefined
```
