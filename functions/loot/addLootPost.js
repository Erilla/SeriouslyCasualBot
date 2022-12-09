const { databaseString } = require('../../config.json');
const Keyv = require('keyv');

const lootResponses = new Keyv(databaseString, { namespace: 'lootResponses' });

const { generateLootPost } = require('./generateLootPost');

const addLootPost = async (channel, boss) => {
	console.log(`Adding loot post to ${channel.name}`);

	const playerResponses = {
		major: '*None*',
		minor: '*None*',
		wantIn: '*None*',
		wantOut: '*None*',
	};

	const messageObject = await generateLootPost(
		boss.name,
		boss.url,
		boss.id,
		playerResponses,
	);

	const message = await channel.send(messageObject);

	const bossLootResponse = {
		major: [],
		minor: [],
		wantIn: [],
		wantOut: [],
		channelId: channel.id,
		messageId: message.id,
		bossName: boss.name,
		bossUrl: boss.url,
	};

	await lootResponses.set(boss.id, bossLootResponse);
};

exports.addLootPost = addLootPost;
