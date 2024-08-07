const { databaseString, priorityLootChannelId } = require('../../config.json');
const { getPriorityRankings } = require('../../services/epgpService');
const Keyv = require('keyv');

const messageIdKey = '_messageId';

const priorityLootPostConfig = new Keyv(databaseString, {
	namespace: 'priorityLootPostConfig',
});

const createPriorityRankingPost = async (interaction) => {
	const client = interaction.client;

	const post = await generatePriorityRankingsPost();

	await client.channels.fetch(priorityLootChannelId).then(async (channel) => {
		const message = await channel.send(post);

		priorityLootPostConfig.set(messageIdKey, message.id);

		await interaction
			.editReply({
				content: 'Created Priority Ranking Post',
				ephemeral: true,
			})
			.catch((err) => console.error(err));
	});
};

const updatePriorityRankingPost = async (client, interaction) => {
	const messageId = await priorityLootPostConfig.get(messageIdKey);

	const post = await generatePriorityRankingsPost();

	await client.channels.fetch(priorityLootChannelId).then(async (channel) => {
		await channel.messages
			.fetch(messageId)
			.then(async (message) => {
				await message.edit(post);
				if (interaction) {
					await interaction
						.editReply({
							content: 'Updated Priority Ranking Post',
							ephemeral: true,
						})
						.catch((err) => console.error(err));
				}
			})
			.catch((err) => console.error(err));
	});
};

const generatePriorityRankingsPost = async (tierToken, armourType) => {
	const response = await getPriorityRankings(tierToken, armourType);

	const nameColumnLength = 15;
	const numberColumnLength = 15;

	let content = '```css\n';

	if (tierToken) content += `Filtered by ${tierToken} token\n`;
	else if (armourType) content += `Filtered by ${armourType}\n`;

	content += `${formatColumn('[Name]', nameColumnLength)}${formatColumn(
		'[EP]',
		numberColumnLength,
	)}${formatColumn('[GP]', numberColumnLength)}${formatColumn(
		'  [PR]',
		numberColumnLength,
	)}\n`;

	for (const raider of response.raiders) {
		let epDifference = raider.points.effortPointsDifference;
		if (+epDifference > 0) epDifference = `+${epDifference}`;

		let gpDifference = raider.points.gearPointsDifference;
		if (+gpDifference > 0) gpDifference = `+${gpDifference}`;

		content += `${formatColumn(
			raider.characterName,
			nameColumnLength,
		)}${formatColumn(
			`${raider.points.effortPoints} [${epDifference}]`,
			numberColumnLength,
		)}${formatColumn(
			`${raider.points.gearPoints} [${gpDifference}]`,
			numberColumnLength,
		)}${formatColumn(
			(Math.round(raider.points.priority * 100) / 100).toFixed(4),
			numberColumnLength,
		)}\n`;
	}

	content += `\n\n[Last Upload: ${new Date(
		response.lastUploadedDate,
	).toUTCString()}]`;
	content += `\n[Cutoff Date for point differences: ${new Date(
		response.cutOffDate,
	).toUTCString()}]`;
	content += '```';

	return content;
};

const formatColumn = (value, length) => {
	const spacesNeeded = length - value.toString().length;
	let result = value;
	result += ' '.repeat(spacesNeeded);
	return result;
};

exports.generatePriorityRankingsPost = generatePriorityRankingsPost;
exports.createPriorityRankingPost = createPriorityRankingPost;
exports.updatePriorityRankingPost = updatePriorityRankingPost;
