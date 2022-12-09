const { databaseString } = require('../../config.json');
const Keyv = require('keyv');

const settingsDb = new Keyv(databaseString, { namespace: 'settings' });
settingsDb.on('error', (err) => console.error('Keyv connection error:', err));

const getAllSettings = async () => {
	let result = '';
	for await (const [key, value] of settingsDb.iterator()) {
		result += `${key}: ${value}\n`;
	}

	return result;
};

exports.getAllSettings = getAllSettings;
