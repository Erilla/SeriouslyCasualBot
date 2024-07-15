const { databaseString } = require('../../config.json');
const { removeRaiderRealm } = require('./removeRaiderRealm');

const Keyv = require('keyv');
const { updateRaiderJsonData } = require('./updateRaiderJsonData');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', (err) => console.error('Keyv connection error:', err));

async function removeRaider(name) {
	if (name === 'SeriouslyCasualRaidersSeeded') return false;

	return await raiders
		.delete(name)
		.then(async () => {
			await removeRaiderRealm(name);
			await updateRaiderJsonData();
			return true;
		})
		.catch((error) => {
			console.error(error);
			return false;
		});
}

exports.removeRaider = removeRaider;
