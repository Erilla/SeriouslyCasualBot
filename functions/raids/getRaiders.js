const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', err => console.error('Keyv connection error:', err));

const getRaiders = async () => {
	let raidersResult = '';

	for await (const [key, value] of raiders.iterator()) {
		if (key !== 'SeriouslyCasualRaidersSeeded') {
			raidersResult += `**Name**: ${key} **ID**: ${value}, `;
		}
	}

	return raidersResult;
};

exports.getRaiders = getRaiders;