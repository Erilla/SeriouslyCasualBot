# Settings

Simple key-value settings store for toggling bot features. Currently only controls raid signup alert toggles.

## Files

- `functions/settings/settings.js` — Setting key constants
- `functions/settings/getSettings.js` — Retrieve single setting value
- `functions/settings/setSetting.js` — Store/update a setting
- `functions/settings/getAllSettings.js` — Retrieve all settings as formatted string
- `commands/settings.js` — Slash command definitions

## Setting Keys

Defined in `functions/settings/settings.js`:

| Key | Purpose | Used By |
|-----|---------|---------|
| `alertSignup_Wednesday` | Enable 1-day signup alert for Wednesday raid | `alertSignups` (Tuesday trigger) |
| `alertSignup_Wednesday_48` | Enable 2-day signup alert for Wednesday raid | `alertSignups` (Monday trigger) |
| `alertSignup_Sunday` | Enable 1-day signup alert for Sunday raid | `alertSignups` (Saturday trigger) |
| `alertSignup_Sunday_48` | Enable 2-day signup alert for Sunday raid | `alertSignups` (Friday trigger) |

All settings are boolean values toggled via `!currentSetting`.

## Functions

### `getSettings(name)`
- Returns setting value, or `false` if not found

### `setSetting(name, value)`
- Stores value under setting name

### `getAllSettings()`
- Iterates all entries in `settings` namespace
- Returns formatted string: `key: value\n` per entry

## Keyv Namespace

| Namespace | Key | Value |
|-----------|-----|-------|
| `settings` | Setting name (string) | Boolean or string |

## Slash Commands

### `/settings get_setting`
- **Option:** `setting_name` (string, required, choices: the 4 alert settings)
- Returns ephemeral message: `"{setting} is currently set as {value}"`

### `/settings toggle_setting`
- **Option:** `setting_name` (string, required, choices: the 4 alert settings)
- Reads current value, flips with `!currentSetting`, saves new value.
- Returns ephemeral message: `"Set {setting} as {newValue}"`

### `/settings get_all_settings`
- No options.
- Returns ephemeral message with all settings formatted as `__**All Settings**__\n{list}`

## Config Dependencies

- `databaseString` — Keyv connection string

## Cross-Domain Usage

Settings are consumed by `functions/raids/alertSignups.js`:
- Before sending a signup alert, checks the relevant setting
- If setting is `false` or undefined, the alert is skipped
- Day mapping: Monday checks `_Wednesday_48`, Tuesday checks `_Wednesday`, Friday checks `_Sunday_48`, Saturday checks `_Sunday`
