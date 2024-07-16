const { guildInfoChannelId, applicationChannelUrl, databaseString } = require('../../config.json');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, Colors, ButtonStyle } = require('discord.js');
const Keyv = require('keyv');
const recruitmentContent = require('../../data/recruitment.json');

const overlords = new Keyv(databaseString, {
	namespace: 'overlords',
});

async function updateRecruitment(interaction) {
	console.log('Updating Recruitment...');

	const contentBody = [];
	await buildRecruitmentBody(contentBody);

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

	const channel = await interaction.client.channels.cache
		.get(guildInfoChannelId);
	await channel
		.send({ embeds: [embed], components: [row], allowedMentions: { users : [] } })
		.catch(err => console.error(err));

	console.log('Finished updating Recruitment.');
}

async function buildRecruitmentBody(contentBody) {
	const space = {
		name: '\u200b',
		value : '\u200b',
	};

	const overlordsString = await getOverlords();

	for (const content of recruitmentContent.content) {
		const overlordsToken = '{{OVERLORDS}}';
		let body = content.body;

		if (body.includes(overlordsToken)) {
			body = body.replace(overlordsToken, overlordsString);
		}

		const newContent = {
			name: content.title,
			value: body,
		};
		console.log(newContent);
		contentBody.push(newContent);
		contentBody.push(space);
	}

	contentBody.pop();
}

async function getOverlords() {

	let result = '';
	for await (const [, value] of overlords.iterator()) {
		if (result !== '') {
			result += ' / ';
		}

		result += `<@${value}>`;
	}

	return result;
}

exports.updateRecruitment = updateRecruitment;