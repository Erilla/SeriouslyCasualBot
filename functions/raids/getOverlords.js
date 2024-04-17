const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const overlords = new Keyv(databaseString, { namespace: 'overlords' });
overlords.on('error', (err) => console.error('Keyv connection error:', err));

const getOverlords = async () => {
	let result = '';

	for await (const [key, value] of overlords.iterator()) {
		result += `${key} (${value})\n`;
	}

	return result;
};

exports.getOverlords = getOverlords;
