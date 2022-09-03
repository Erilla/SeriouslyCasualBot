const { databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { updateRaiderJsonData } = require('./updateRaiderJsonData');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', err => console.error('Keyv connection error:', err));

async function updateRaider(previousName, newName) {
	if (previousName === 'SeriouslyCasualRaidersSeeded') return false;

	const raider = await raiders.get(previousName);

	if (raider) {
		const setNew = raiders.set(newName, raider);
		const deletePrevious = raiders.delete(previousName);

		return await Promise.all([setNew, deletePrevious])
			.then(async () => {
				await updateRaiderJsonData();
				return true;
			})
			.catch((error) => {
				console.error(error);
				return false;
			});
	}

	return false;
}

exports.updateRaider = updateRaider;