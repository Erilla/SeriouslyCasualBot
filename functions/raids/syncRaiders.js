const { botSetupChannelId } = require('../../config.json');
const { getGuildRoster } = require('../../services/raiderioService');
const { getStoredRaiders } = require('../raids/getStoredRaiders');
const { getStoredRaiderRealms } = require('../raids/getStoredRaiderRealms');

const { addRaider } = require('../raids/addRaider');
const { addRaiderRealm } = require('../raids/addRaiderRealm');
const { removeRaider } = require('../raids/removeRaider');
const { removeRaiderRealm } = require('../raids/removeRaiderRealm');
const { getStoredIgnoredCharacters } = require('../raids/ignoreCharacter');

const { sendAlertForRaidersWithNoUser } = require('./sendAlertForRaidersWithNoUser');

const syncRaiders = async (client) => {
	const storedRaiders = await getStoredRaiders();
	const storedCharacterNames = storedRaiders.map(s => s.name);
	const storedCharacterLowered = storedRaiders.map(s => s.name.toLowerCase());

	const storedRaiderRealms = await getStoredRaiderRealms();
	const storedRaiderRealmsLowered = storedRaiderRealms.map(s => s.name.toLowerCase());

	const ignoreCharacters = await getStoredIgnoredCharacters();

	const wholeRoster = await getGuildRoster();
	const guildRoster = ignoreCharacters.length > 0 ? wholeRoster.filter(r => !ignoreCharacters.includes(r.character.name)) : wholeRoster;
	if (guildRoster.length) {
		const characterNamesLowered = guildRoster.map(r => r.character.name.toLowerCase());

		const needToRemove = storedCharacterNames
			.filter(storedName => !characterNamesLowered.includes(storedName.toLowerCase()));

		for (const character of ignoreCharacters) {
			if (storedCharacterNames.includes(character)) {
				needToRemove.push(character);
			}
		}

		const botSetupChannel = await client.channels.fetch(botSetupChannelId).then((channel) => channel);
		let summaryMessage = '';

		if (needToRemove.length > 0) {
			summaryMessage += 'Removed raiders:\n';

			for (const value of needToRemove) {
				await removeRaider(value);
				summaryMessage += `${value}\n`;
			}

			summaryMessage += '\n';
		}

		const needToAdd = guildRoster.map(r => r.character.name)
			.filter((character) => !storedCharacterLowered.includes(character.toLowerCase()));

		if (needToAdd.length > 0) {
			summaryMessage += 'Added raiders:\n';

			for (const value of needToAdd) {
				await addRaider(value, null);
				summaryMessage += `${value}\n`;
			}
			summaryMessage += '\n';

			await sendAlertForRaidersWithNoUser(client, needToAdd);
		}

		if (summaryMessage.length > 0) {
			await botSetupChannel.send(summaryMessage);
		}

		const needToRemoveFromRealm = storedRaiderRealms
			.filter(stored => !characterNamesLowered.includes(stored.name.toLowerCase()));


		if (needToRemoveFromRealm.length > 0) {
			needToRemoveFromRealm.forEach(async toBeRemoved => {
				await removeRaiderRealm(toBeRemoved.name);
			});
		}

		const needToAddToRealm = guildRoster.map(r => { return { name: r.character.name, realm: r.character.realm }; })
			.filter((character) => !storedRaiderRealmsLowered.includes(character.name.toLowerCase()));

		if (needToAddToRealm.length > 0) {
			needToAddToRealm.forEach(async (value) => {
				await addRaiderRealm(value.name, value.realm);
			});
		}
	}
};

exports.syncRaiders = syncRaiders;
