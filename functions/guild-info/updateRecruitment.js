const { guildInfoChannelId, applicationChannelUrl } = require('../../config.json');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const recruitmentContent = require('../../data/recruitment.json');

function updateRecruitment(interaction) {
	console.log('Updating Recruitment...');

	const contentBody = [];
	buildRecruitmentBody(contentBody);

	const embed = new MessageEmbed()
		.setTitle(recruitmentContent.title)
		.addFields(contentBody)
		.setColor('GREEN');

	const row = new MessageActionRow()
		.addComponents(
			new MessageButton()
				.setLabel('Apply Here')
				.setStyle('LINK')
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