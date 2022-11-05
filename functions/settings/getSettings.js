const { databaseString } = require('../../config.json');
const Keyv = require('keyv');

const settingsDb = new Keyv(databaseString, { namespace: 'settings' });
settingsDb.on('error', err => console.error('Keyv connection error:', err));

const getSettings = async (setting) => await settingsDb.get(setting) ?? false;

exports.getSettings = getSettings;