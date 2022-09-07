const { databaseString, raiderJson } = require('../../config.json');
const raidersSeedData = require('../../data/raidersSeedData.json');

const Keyv = require('keyv');
const { updateRaiderJsonData } = require('./updateRaiderJsonData');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', err => console.error('Keyv connection error:', err));

const addRaiders = async (override = false, useSeedData = false) => {
	const seededKey = 'SeriouslyCasualRaidersSeeded';
	const seeded = await raiders
		.get(seededKey)
		.catch(err => console.error(err));

	if (override || !seeded) {
		console.log('Seeding raiders...');
		await raiders
			.clear()
			.catch(err => console.error(err));

		let raidersJson = null;

		if (useSeedData) {
			console.log('Using Seed Data');
			raidersJson = raidersSeedData;
		}
		else {
			try {
				raidersJson = require(`../../data/${raiderJson}`);
				console.log('Using Existing Data');
			}
			catch (error) {
				raidersJson = raidersSeedData;
				console.log(error);
				console.log('Using Seed Data (Could not get existing data)');
			}
		}

		raidersJson.forEach(async raiderSeedData => {
			await raiders
				.set(raiderSeedData.name, raiderSeedData.userId)
				.catch(err => console.error(err));
		});

		await raiders
			.set(seededKey, true)
			.catch(err => console.error(err));
		await updateRaiderJsonData();
		return;
	}

	throw 'Did not seed raiders: Already seeded';
};

exports.addRaiders = addRaiders;