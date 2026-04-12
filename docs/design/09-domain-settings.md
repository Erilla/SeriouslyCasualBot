# 09 -- Feature Toggles (Settings)

> Domain directory: `functions/settings/` (4 files)
> Command file: `commands/settings.js`
> Keyv namespace: `settings`
> Consumer: `functions/raids/alertSignups.js`
> Scheduled tasks: none (settings are consumed by scheduled tasks, not scheduled themselves)

---

## Overview

The settings system provides boolean feature toggles that control whether specific raid signup alerts are sent. There are exactly 4 settings, each mapping to a specific day-of-week alert in the signup notification system. Settings are stored as booleans in a Keyv namespace and can be read, toggled, or listed via slash commands.

---

## Files

| File | Exports | Purpose |
|------|---------|---------|
| `settings.js` | `settings` (object) | Defines the 4 setting key constants |
| `getSettings.js` | `getSettings(setting)` | Read a single setting with `false` default |
| `setSetting.js` | `setSetting(setting, newValue)` | Write a single setting |
| `getAllSettings.js` | `getAllSettings()` | Read all settings as formatted string |

---

## Settings Object

**File:** `functions/settings/settings.js`

```js
const settings = {
    alertSignup_Wednesday: 'alertSignup_Wednesday',
    alertSignup_Wednesday_48: 'alertSignup_Wednesday_48',
    alertSignup_Sunday: 'alertSignup_Sunday',
    alertSignup_Sunday_48: 'alertSignup_Sunday_48',
};
```

Each key maps to itself as a string value. The object serves as a constant enum -- code references `settings.alertSignup_Wednesday` instead of raw strings.

| Setting Key | Purpose |
|-------------|---------|
| `alertSignup_Wednesday` | 24-hour reminder for Wednesday raid (sent Tuesday) |
| `alertSignup_Wednesday_48` | 48-hour reminder for Wednesday raid (sent Monday) |
| `alertSignup_Sunday` | 24-hour reminder for Sunday raid (sent Saturday) |
| `alertSignup_Sunday_48` | 48-hour reminder for Sunday raid (sent Friday) |

---

## Operations

### Get Setting

**File:** `functions/settings/getSettings.js`

```js
const getSettings = async (setting) => await settingsDb.get(setting) ?? false;
```

- Returns the stored boolean value for the given setting key.
- If the key does not exist in the database (returns `undefined` or `null`), the nullish coalescing operator `??` returns `false` as the default.
- This means all settings default to `false` (disabled) until explicitly set to `true`.

**Database instance:** `new Keyv(databaseString, { namespace: 'settings' })` with error handler.

### Set Setting

**File:** `functions/settings/setSetting.js`

```js
const setSetting = async (setting, newValue) => await settingsDb.set(setting, newValue);
```

- Writes the given value (boolean) to the database under the given key.
- No validation on key or value -- any string key and any value can be stored.

**Database instance:** `new Keyv(databaseString, { namespace: 'settings' })` with error handler.

### Get All Settings

**File:** `functions/settings/getAllSettings.js`

```js
const getAllSettings = async () => {
    let result = '';
    for await (const [key, value] of settingsDb.iterator()) {
        result += `${key}: ${value}\n`;
    }
    return result;
};
```

- Iterates all entries in the `settings` Keyv namespace.
- Builds a formatted string with one line per setting: `"key: value\n"`.
- Returns the concatenated string.
- If no settings exist, returns an empty string `''`.

**Database instance:** `new Keyv(databaseString, { namespace: 'settings' })` with error handler.

### Toggle (in command handler)

The toggle operation is implemented directly in the command handler (`commands/settings.js`), not as a separate function file:

```js
const currentSetting = await getSettings(setting);
const newSetting = !currentSetting;
await setSetting(setting, newSetting);
```

- Reads the current value via `getSettings()` (defaults to `false` if unset).
- Negates it with `!currentSetting`.
- Writes the new value via `setSetting()`.
- This means the first toggle of an unset setting will set it to `true` (since `!false === true`).

---

## Database Details

**Namespace:** `settings`

**Key:** Setting name string (one of the 4 defined constants)

**Value:** Boolean (`true` or `false`)

**Connection pattern:** Each of the 3 DB-accessing files creates its own Keyv instance:
```js
const settingsDb = new Keyv(databaseString, { namespace: 'settings' });
settingsDb.on('error', err => console.error('Keyv connection error:', err));
```

This is consistent with the project-wide pattern of per-file Keyv instances.

---

## Consumer Map

Each setting controls a specific `case` branch in the `alertSignups` function (`functions/raids/alertSignups.js`). The `alertSignups` function runs via cron at `0 19 * * 1,2,5,6` (7 PM on Monday, Tuesday, Friday, Saturday).

| Setting | Day of Week | Case | Alert Type | Raid Day |
|---------|-------------|------|------------|----------|
| `alertSignup_Wednesday_48` | Monday (1) | `case 1` | 48-hour reminder | Wednesday |
| `alertSignup_Wednesday` | Tuesday (2) | `case 2` | 24-hour reminder | Wednesday |
| `alertSignup_Sunday_48` | Friday (5) | `case 5` | 48-hour reminder | Sunday |
| `alertSignup_Sunday` | Saturday (6) | `case 6` | 24-hour reminder | Sunday |

**How settings are checked in alertSignups:**

```js
switch (getTodayDoW) {
    case 1: {
        // Monday, checks for Wednesday raid
        twoDayReminder = true;
        nextRaidDay.setDate(today.getDate() + 2);
        const wednesdaySetting = await getSettings(settings.alertSignup_Wednesday_48);
        if (!wednesdaySetting) {
            console.log('Wednesday Raid Alert disabled - Skipping...');
            return;
        }
        break;
    }
    case 2: {
        // Tuesday, checks for Wednesday raid
        nextRaidDay.setDate(today.getDate() + 1);
        const wednesdaySetting = await getSettings(settings.alertSignup_Wednesday);
        if (!wednesdaySetting) {
            console.log('Wednesday Raid Alert disabled - Skipping...');
            return;
        }
        break;
    }
    case 5: {
        // Friday, checks for Sunday raid
        twoDayReminder = true;
        nextRaidDay.setDate(today.getDate() + 2);
        const sundaySetting = await getSettings(settings.alertSignup_Sunday_48);
        if (!sundaySetting) {
            console.log('Sunday Raid Alert disabled - Skipping...');
            return;
        }
        break;
    }
    case 6: {
        // Saturday, checks for Sunday raid
        nextRaidDay.setDate(today.getDate() + 1);
        const sundaySetting = await getSettings(settings.alertSignup_Sunday);
        if (!sundaySetting) {
            console.log('Sunday Raid Alert disabled - Skipping...');
            return;
        }
        break;
    }
}
```

If a setting is `false` (or unset, which defaults to `false`), the corresponding alert is skipped entirely with an early `return`. The function does nothing for days not in the switch cases (Sunday through Thursday, except Tuesday which is case 2, and Monday which is case 1).

---

## Slash Command Interface

**Command:** `/settings` with 3 subcommands (defined in `commands/settings.js`)

### get_setting

| Parameter | Type | Required | Choices |
|-----------|------|----------|---------|
| `setting_name` | string choice | yes | All 4 settings |

**Response:** `"${setting} is currently set as ${currentSetting}"` (ephemeral)

The displayed value will be `true` or `false`.

### toggle_setting

| Parameter | Type | Required | Choices |
|-----------|------|----------|---------|
| `setting_name` | string choice | yes | All 4 settings |

**Response:** `"Set ${setting} as ${newSetting}"` (ephemeral)

Reads current value, negates, writes, reports new value.

### get_all_settings

| Parameter | Type | Required |
|-----------|------|----------|
| (none) | - | - |

**Response:** `"__**All Settings**__\n${allSettings}"` (ephemeral)

The `allSettings` string is built by iterating the Keyv namespace, showing all stored key-value pairs. If no settings have ever been set, this shows just the header with no entries.

### Choice Arrays

Both `get_setting` and `toggle_setting` present the same 4 choices:

```js
.setChoices(
    { name: settings.alertSignup_Wednesday, value: settings.alertSignup_Wednesday },
    { name: settings.alertSignup_Wednesday_48, value: settings.alertSignup_Wednesday_48 },
    { name: settings.alertSignup_Sunday, value: settings.alertSignup_Sunday },
    { name: settings.alertSignup_Sunday_48, value: settings.alertSignup_Sunday_48 },
)
```

Both `name` and `value` are the same string (e.g., `'alertSignup_Wednesday'`). The `name` is what users see in the Discord choice picker; the `value` is what the bot receives.

---

## Cross-Domain Dependencies

| Dependency | Direction | Detail |
|-----------|-----------|--------|
| `alertSignups` | Consumer | Reads settings to decide whether to send raid signup alerts |
| `config.json` | Config | `databaseString` (SQLite path) |

The settings domain has no dependencies on other domains -- it is a pure leaf node that provides configuration to the raids domain.

---

## Rebuild Checklist

1. Create `functions/settings/settings.js` with the 4-key constant object.
2. Create `functions/settings/getSettings.js` with the `?? false` default.
3. Create `functions/settings/setSetting.js` with the simple set operation.
4. Create `functions/settings/getAllSettings.js` with the iterator-based formatter.
5. Register the `/settings` slash command in `commands/settings.js` with 3 subcommands and choice arrays mirroring the settings object.
6. Ensure `alertSignups` in `functions/raids/alertSignups.js` imports both `settings` and `getSettings` and checks before each alert.
7. Initialize settings to `true` via `/settings toggle_setting` for each alert you want active (all default to `false`/disabled).
