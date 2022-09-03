const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', err => console.error('Keyv connection error:', err));

const getRaiders = async () => {
	const raidersData = [];

	for await (const [key, value] of raiders.iterator()) {
		if (key !== 'SeriouslyCasualRaidersSeeded') {
			raidersData.push({ name: key, userId: value });
		}
	}

	return raidersData;
};

exports.getRaiders = getRaiders;