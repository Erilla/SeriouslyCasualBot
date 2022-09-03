const { databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { updateRaiderJsonData } = require('./updateRaiderJsonData');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', err => console.error('Keyv connection error:', err));

async function addRaider(name, userId) {
	if (name === 'SeriouslyCasualRaidersSeeded') return false;

	return await raiders.set(name, userId)
		.then(async () => {
			await updateRaiderJsonData();
			return true;
		})
		.catch((error) => {
			console.error(error);
			return false;
		});
}

exports.addRaider = addRaider;