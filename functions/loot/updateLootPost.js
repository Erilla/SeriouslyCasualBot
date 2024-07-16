const { databaseString } = require('../../config.json');
const Keyv = require('keyv');

const lootResponses = new Keyv(databaseString, { namespace: 'lootResponses' });
lootResponses.on('error', (err) =>
	console.error('Keyv connection error:', err),
);

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', (err) => console.error('Keyv connection error:', err));

const { generateLootPost } = require('./generateLootPost');

const updateLootPost = async (client, bossId) => {
	console.log('Updating loot post..');

	const bossLootResponses = await lootResponses.get(bossId);

	const raidersObject = await getRaiders();

	const playerResponses = {
		major: await generatePlayerResponseString(
			bossLootResponses.major,
			raidersObject,
		),
		minor: await generatePlayerResponseString(
			bossLootResponses.minor,
			raidersObject,
		),
		wantIn: await generatePlayerResponseString(
			bossLootResponses.wantIn,
			raidersObject,
		),
		wantOut: await generatePlayerResponseString(
			bossLootResponses.wantOut,
			raidersObject,
		),
	};

	const messageObject = await generateLootPost(
		bossLootResponses.bossName,
		bossLootResponses.bossUrl,
		bossId,
		playerResponses,
	);

	await client.channels
		.fetch(bossLootResponses.channelId)
		.then(async (channel) => {
			await channel.messages
				.fetch(bossLootResponses.messageId)
				.then(async (message) => {
					await message.edit(messageObject);
				});
		});
};

const generatePlayerResponseString = async (playersId, raidersObject) => {
	let result = '';

	for (const playerId of playersId) {
		const raiderObject = raidersObject.find((o) => o.value === playerId);
		if (raiderObject) {
			result += `${raiderObject.key}\n`;
		}
	}

	return playersId.length && result.length ? result : '*None*';
};

const getRaiders = async () => {
	const raidersObject = [];

	for await (const [key, value] of raiders.iterator()) {
		raidersObject.push({ key, value });
	}

	return raidersObject;
};

exports.updateLootPost = updateLootPost;
