const { UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { getStoredRaiders } = require('./getStoredRaiders');
const { botSetupChannelId } = require('../../config.json');

async function sendAlertForRaidersWithNoUser(client, missingUser) {
	if (!missingUser) {
		const storedRaiders = await getStoredRaiders();
		missingUser = storedRaiders
			.filter(s => s.userId === null)
			.map(s => s.name);
	}

	if (missingUser.length > 0) {
		await client.channels.fetch(botSetupChannelId).then(async (channel) => {
			for (const missing of missingUser) {
				const userSelect = new UserSelectMenuBuilder()
					.setCustomId('missing_user_select')
					.setPlaceholder(`Select user for ${missing}`)
					.setMinValues(1)
					.setMaxValues(1);

				const row = new ActionRowBuilder()
					.addComponents(userSelect);
				await channel.send({ content: missing, components: [row] })
					.then(message =>
						message.pin(),
					);
			}
		});
	}

}

exports.sendAlertForRaidersWithNoUser = sendAlertForRaidersWithNoUser;