const { databaseString } = require('../../config.json');
const Keyv = require('keyv');

const lootResponses = new Keyv(databaseString, { namespace: 'lootResponses' });

const deleteLootPost = async (client, bossId) => {
	const bossLootResponses = await lootResponses.get(bossId);

	if (!bossLootResponses) throw 'Cannot find boss loot';

	await client.channels
		.fetch(bossLootResponses.channelId)
		.then(async (channel) => {
			await channel.messages
				.fetch(bossLootResponses.messageId)
				.then(async (message) => await message.delete());
		});

	await lootResponses.delete(bossId);
};

exports.deleteLootPost = deleteLootPost;
