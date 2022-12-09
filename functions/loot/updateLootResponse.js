const { databaseString } = require('../../config.json');
const Keyv = require('keyv');

const lootResponses = new Keyv(databaseString, { namespace: 'lootResponses' });

const { updateLootPost } = require('./updateLootPost');

const updateLootResponse = async (client, response, bossId, userId) => {
	let bossLootResponses = await lootResponses.get(bossId);

	bossLootResponses = removeFromAllLootResponses(bossLootResponses, userId);

	bossLootResponses[response].push(userId);

	await lootResponses.set(bossId, bossLootResponses);

	await updateLootPost(client, bossId);

	return '';
};

const removeFromAllLootResponses = (bossLootResponses, userId) => {
	const result = bossLootResponses;
	result.major = bossLootResponses.major.filter((r) => r !== userId);
	result.minor = bossLootResponses.minor.filter((r) => r !== userId);
	result.wantIn = bossLootResponses.wantIn.filter((r) => r !== userId);
	result.wantOut = bossLootResponses.wantOut.filter((r) => r !== userId);
	return result;
};

exports.updateLootResponse = updateLootResponse;
