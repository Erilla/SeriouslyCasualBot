const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const raidersRealms = new Keyv(databaseString, { namespace: 'raidersRealms' });
raidersRealms.on('error', (err) => console.error('Keyv connection error:', err));

const getStoredRaiderRealms = async () => {
	const raidersObject = [];

	for await (const [key, value] of raidersRealms.iterator()) {
		if (key !== 'SeriouslyCasualRaidersSeeded') {
			raidersObject.push({ 'name': key, 'realm': value });
		}
	}
	return raidersObject;
};

exports.getStoredRaiderRealms = getStoredRaiderRealms;
