const { getGuildRoster } = require('../../services/battleNetService');
const { getStoredRaiders } = require('../raids/getStoredRaiders');
const { getStoredRaiderRealms } = require('../raids/getStoredRaiderRealms');

const { addRaider } = require('../raids/addRaider');
const { addRaiderRealm } = require('../raids/addRaiderRealm');
const { removeRaider } = require('../raids/removeRaider');
const { removeRaiderRealm } = require('../raids/removeRaiderRealm');

const { sendAlertForRaidersWithNoUser } = require('./sendAlertForRaidersWithNoUser');

const syncRaiders = async (client) => {
	const storedRaiders = await getStoredRaiders();
	const storedCharacterNames = storedRaiders.map(s => s.name);
	const storedCharacterLowered = storedRaiders.map(s => s.name.toLowerCase());

	const storedRaiderRealms = await getStoredRaiderRealms();
	const storedRaiderRealmsLowered = storedRaiderRealms.map(s => s.name.toLowerCase());

	const guildRoster = await getGuildRoster();
	if (guildRoster) {
		const characterNamesLowered = guildRoster.map(r => r.character.name.toLowerCase());

		const needToRemove = storedCharacterNames
			.filter(storedName => !characterNamesLowered.includes(storedName.toLowerCase()));

		if (needToRemove) {
			needToRemove.forEach(async (value) => {
				await removeRaider(value);
			});
		}

		const needToAdd = guildRoster.map(r => r.character.name)
			.filter((character) => !storedCharacterLowered.includes(character.toLowerCase()));

		if (needToAdd) {
			needToAdd.forEach(async (value) => {
				await addRaider(value, null);
			});

			await sendAlertForRaidersWithNoUser(client, needToAdd);
		}

		const needToRemoveFromRealm = storedRaiderRealms
			.filter(stored => !characterNamesLowered.includes(stored.name.toLowerCase()));


		if (needToRemoveFromRealm) {
			needToRemoveFromRealm.forEach(async toBeRemoved => {
				await removeRaiderRealm(toBeRemoved.name);
			});
		}

		const needToAddToRealm = guildRoster.map(r => { return { name: r.character.name, realm: r.character.realm.slug }; })
			.filter((character) => !storedRaiderRealmsLowered.includes(character.name.toLowerCase()));

		if (needToAddToRealm) {
			needToAddToRealm.forEach(async (value) => {
				await addRaiderRealm(value.name, value.realm);
			});
		}
	}
};

exports.syncRaiders = syncRaiders;
