const { databaseString } = require('../../config.json');
const Keyv = require('keyv');

const settingsDb = new Keyv(databaseString, { namespace: 'settings' });
settingsDb.on('error', err => console.error('Keyv connection error:', err));

const setSetting = async (setting, newValue) => await settingsDb.set(setting, newValue);

exports.setSetting = setSetting;