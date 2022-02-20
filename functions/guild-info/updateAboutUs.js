const { guildInfoChannelId } = require('../../config.json');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const aboutUsContent = require('../../data/aboutus.json');

function updateAboutUs(interaction) {
	console.log('Updating About Us...');
	const embed = new MessageEmbed()
		.setTitle(aboutUsContent.title)
		.setDescription(aboutUsContent.content)
		.setColor('GREEN');
	const row = new MessageActionRow()
		.addComponents(
			new MessageButton()
				.setLabel('RaiderIO')
				.setStyle('LINK')
				.setURL(aboutUsContent.raiderioUrl)
				.setEmoji(aboutUsContent.raiderioIcon),
			new MessageButton()
				.setLabel('WoWProgress')
				.setStyle('LINK')
				.setURL(aboutUsContent.wowProgressUrl)
				.setEmoji(aboutUsContent.wowProgrsesIcon),
			new MessageButton()
				.setLabel('Warcraft Logs')
				.setStyle('LINK')
				.setURL(aboutUsContent.warcraftLogsUrl)
				.setEmoji(aboutUsContent.warcraftLogsIcon),
		);

	const channel = interaction.client.channels.cache.get(guildInfoChannelId);
	channel.send({ embeds: [embed], components: [row] });

	console.log('Finished updating About Us.');
}

exports.updateAboutUs = updateAboutUs;