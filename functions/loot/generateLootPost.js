const {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonStyle,
	ButtonBuilder,
} = require('discord.js');

const generateLootPost = async (bossName, bossUrl, bossId, playerResponses) => {
	const embed = new EmbedBuilder()
		.setTitle(bossName)
		.setURL(bossUrl)
		.addFields(
			{
				name: 'Major',
				value: playerResponses.major,
				inline: true,
			},
			{ name: 'Minor', value: playerResponses.minor, inline: true },
			{
				name: 'Want In',
				value: playerResponses.wantIn,
				inline: true,
			},
			{
				name: 'Do not need',
				value: playerResponses.wantOut,
				inline: true,
			},
		)
		.setTimestamp();

	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`updateLootResponse|major|${bossId}`)
			.setLabel('Major')
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId(`updateLootResponse|minor|${bossId}`)
			.setLabel('Minor')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId(`updateLootResponse|wantIn|${bossId}`)
			.setLabel('Want In')
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId(`updateLootResponse|wantOut|${bossId}`)
			.setLabel('Do not need')
			.setStyle(ButtonStyle.Danger),
	);

	return { embeds: [embed], components: [row] };
};

exports.generateLootPost = generateLootPost;
