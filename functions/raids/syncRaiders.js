const { databaseString } = require('../../config.json');
const { getGuildRoster } = require('../../services/battleNetService');
const { getStoredRaiders } = require('../raids/getStoredRaiders');
const { addRaider } = require('../raids/addRaider');
const { removeRaider } = require('../raids/removeRaider');

const Keyv = require('keyv');
const { sendAlertForRaidersWithNoUser } = require('./sendAlertForRaidersWithNoUser');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', (err) => console.error('Keyv connection error:', err));

const syncRaiders = async (client) => {
	const storedRaiders = await getStoredRaiders();
	const storedCharacterNames = storedRaiders.map(s => s.name);
	const storedCharacterLowered = storedRaiders.map(s => s.name.toLowerCase());

	const guildRoster = await getGuildRoster();
	const characterNames = guildRoster.map(r => r.character.name);
	const characterNamesLowered = guildRoster.map(r => r.character.name.toLowerCase());

	const needToRemove = storedCharacterNames
		.filter(storedName => !characterNamesLowered.includes(storedName.toLowerCase()));

	if (needToRemove) {
		needToRemove.forEach(async (value) => {
			await removeRaider(value);
		});
	}

	const needToAdd = characterNames
		.filter((character) => !storedCharacterLowered.includes(character.toLowerCase()));

	if (needToAdd) {
		needToAdd.forEach(async (value) => {
			await addRaider(value, null);
		});

		await sendAlertForRaidersWithNoUser(client, needToAdd);
	}
};

exports.syncRaiders = syncRaiders;
