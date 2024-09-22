const { databaseString, priorityLootChannelId } = require('../../config.json');
const { getPriorityRankings } = require('../../services/epgpService');
const Keyv = require('keyv');


const messageHeaderIdKey = '_messageHeaderId';
const messageBodyIdKey = '_messageId';
const messageFooterIdKey = '_messageFooterId';

const priorityLootPostConfig = new Keyv(databaseString, {
	namespace: 'priorityLootPostConfig',
});

const createPriorityRankingPost = async (interaction) => {
	const client = interaction.client;

	const [header, post, footer] = await generatePriorityRankingsPost();

	await client.channels.fetch(priorityLootChannelId).then(async (channel) => {
		await channel.send(header).then(async (headerMessage) => {
			priorityLootPostConfig.set(messageHeaderIdKey, headerMessage.id);

			await channel.send(post).then(async (bodyMessage) => {
				priorityLootPostConfig.set(messageBodyIdKey, bodyMessage.id);

				await channel.send(footer).then(async (footerMessage) => {
					priorityLootPostConfig.set(messageFooterIdKey, footerMessage.id);
				});
			});
		});

		await interaction
			.editReply({
				content: 'Created Priority Ranking Post',
				ephemeral: true,
			})
			.catch((err) => console.error(err));
	});
};

const updatePriorityRankingPost = async (client, interaction) => {
	const messageBodyId = await priorityLootPostConfig.get(messageBodyIdKey);
	const messageHeaderId = await priorityLootPostConfig.get(messageFooterIdKey);

	const [, post, footer] = await generatePriorityRankingsPost();

	await client.channels.fetch(priorityLootChannelId).then(async (channel) => {
		await channel.messages
			.fetch(messageBodyId)
			.then(async (message) => {
				await message.edit(post);
			})
			.catch((err) => console.error(err));

		await channel.messages
			.fetch(messageHeaderId)
			.then(async (message) => {
				await message.edit(footer);
			})
			.catch((err) => console.error(err));

		if (interaction) {
			await interaction
				.editReply({
					content: 'Updated Priority Ranking Post',
					ephemeral: true,
				})
				.catch((err) => console.error(err));
		}
	});
};

const generatePriorityRankingsPost = async (tierToken, armourType) => {
	const response = await getPriorityRankings(tierToken, armourType);

	const nameColumnLength = 15;
	const numberColumnLength = 13;

	let content = '```css\n';

	if (tierToken) content += `Filtered by ${tierToken} token\n`;
	else if (armourType) content += `Filtered by ${armourType}\n`;

	let header = content;
	let footer = content;

	header += `${formatColumn('[Name]', nameColumnLength)}${formatColumn(
		'[EP]',
		numberColumnLength,
	)}${formatColumn('[GP]', numberColumnLength)}${formatColumn(
		'  [PR]',
		numberColumnLength,
	)}\n`;
	header += '```';


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
		)}${(Math.round(raider.points.priority * 100) / 100).toFixed(3)}\n`;
	}
	content += '```';

	footer += `\n\n[Last Upload: ${new Date(
		response.lastUploadedDate,
	).toUTCString()}]`;
	footer += `\n[Cutoff Date for point differences: ${new Date(
		response.cutOffDate,
	).toUTCString()}]`;
	footer += '```';

	return [header, content, footer];
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
