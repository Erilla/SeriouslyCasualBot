const { guildInfoChannelId, applicationChannelUrl } = require('../../config.json');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, Colors, ButtonStyle } = require('discord.js');
const recruitmentContent = require('../../data/recruitment.json');

function updateRecruitment(interaction) {
	console.log('Updating Recruitment...');

	const contentBody = [];
	buildRecruitmentBody(contentBody);

	const embed = new EmbedBuilder()
		.setTitle(recruitmentContent.title)
		.addFields(contentBody)
		.setColor(Colors.Green);

	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setLabel('Apply Here')
				.setStyle(ButtonStyle.Link)
				.setURL(applicationChannelUrl),
		);

	const channel = interaction.client.channels.cache.get(guildInfoChannelId);
	channel.send({ embeds: [embed], components: [row], allowedMentions: { users : [] } });

	console.log('Finished updating Recruitment.');
}

function buildRecruitmentBody(contentBody) {
	const space = {
		name: '\u200b',
		value : '\u200b',
	};

	recruitmentContent.content.forEach(content => {
		const newContent = {
			name: content.title,
			value: content.body,
		};
		contentBody.push(newContent);
		contentBody.push(space);
	});

	contentBody.pop();
}

exports.updateRecruitment = updateRecruitment;