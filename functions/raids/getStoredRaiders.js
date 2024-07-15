const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', (err) => console.error('Keyv connection error:', err));

const getStoredRaiders = async () => {
	const raidersObject = [];

	for await (const [key, value] of raiders.iterator()) {
		if (key !== 'SeriouslyCasualRaidersSeeded') {
			raidersObject.push({ 'name': key, 'userId': value });
		}
	}
	return raidersObject;
};

exports.getStoredRaiders = getStoredRaiders;
