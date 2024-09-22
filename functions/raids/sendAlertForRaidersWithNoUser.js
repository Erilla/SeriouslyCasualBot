const { UserSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
				const firstRow = new ActionRowBuilder()
					.addComponents(
						new UserSelectMenuBuilder()
							.setCustomId('missing_user_select')
							.setPlaceholder(`Select user for ${missing}`)
							.setMinValues(1)
							.setMaxValues(1),
					);

				const secondRow = new ActionRowBuilder()
					.addComponents(
						new ButtonBuilder()
							.setCustomId('ignore_missing_character')
							.setLabel('Ignore character')
							.setStyle(ButtonStyle.Danger),
					);

				await channel.send({ content: missing, components: [firstRow, secondRow ] })
					.then(message =>
						message.pin(),
					);
			}
		});
	}

}

exports.sendAlertForRaidersWithNoUser = sendAlertForRaidersWithNoUser;