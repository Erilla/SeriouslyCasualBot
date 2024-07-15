const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const raidersRealms = new Keyv(databaseString, { namespace: 'raidersRealms' });
raidersRealms.on('error', err => console.error('Keyv connection error:', err));

async function addRaiderRealm(name, realm) {
	if (name === 'SeriouslyCasualRaidersSeeded') return false;

	return await raidersRealms.set(name, realm)
		.then(async () => {
			return true;
		})
		.catch((error) => {
			console.error(error);
			return false;
		});
}

exports.addRaiderRealm = addRaiderRealm;