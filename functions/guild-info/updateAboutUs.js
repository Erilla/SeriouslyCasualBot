const { guildInfoChannelId } = require('../../config.json');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors } = require('discord.js');
const aboutUsContent = require('../../data/aboutus.json');

async function updateAboutUs(interaction) {
	console.log('Updating About Us...');
	const embed = new EmbedBuilder()
		.setTitle(aboutUsContent.title)
		.setDescription(aboutUsContent.content)
		.setColor(Colors.Green);
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setLabel('RaiderIO')
				.setStyle(ButtonStyle.Link)
				.setURL(aboutUsContent.raiderioUrl)
				.setEmoji(aboutUsContent.raiderioIcon),
			new ButtonBuilder()
				.setLabel('WoWProgress')
				.setStyle(ButtonStyle.Link)
				.setURL(aboutUsContent.wowProgressUrl)
				.setEmoji(aboutUsContent.wowProgrsesIcon),
			new ButtonBuilder()
				.setLabel('Warcraft Logs')
				.setStyle(ButtonStyle.Link)
				.setURL(aboutUsContent.warcraftLogsUrl)
				.setEmoji(aboutUsContent.warcraftLogsIcon),
		);

	const channel = await interaction.client.channels.cache.get(guildInfoChannelId);
	await channel
		.send({ embeds: [embed], components: [row] })
		.catch(err => console.error(err));

	console.log('Finished updating About Us.');
}

exports.updateAboutUs = updateAboutUs;