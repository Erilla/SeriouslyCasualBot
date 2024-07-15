const {
	getPreviousWeeklyHighestMythicPlusRun,
} = require('../../services/raiderioService');
const { Buffer } = require('node:buffer');
const { databaseString, weeklyCheckChannelId } = require('../../config.json');

const Keyv = require('keyv');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', (err) => console.error('Keyv connection error:', err));

const raidersRealms = new Keyv(databaseString, { namespace: 'raidersRealms' });
raidersRealms.on('error', (err) => console.error('Keyv connection error:', err));

const getHighestMythicPlusDoneMessage = async () => {
	let content = '';

	for await (const [key] of raiders.iterator()) {
		if (key !== 'SeriouslyCasualRaidersSeeded') {
			console.log(`Retrieving runs for ${key}`);

			const realm = await raidersRealms.get(key);

			const result = await getPreviousWeeklyHighestMythicPlusRun(
				'eu',
				realm,
				key,
			);

			let runs = result.mythic_plus_previous_weekly_highest_level_runs?.map(
				(r) => r.mythic_level,
			);

			if (typeof runs === 'undefined') runs = 'Error';
			if (runs.length === 0) runs = 'None';

			content += `${key}: [${runs}]\n`;
		}
	}

	const buffer = Buffer.from(content, 'utf-8');

	const today = new Date();

	return {
		content: 'Highest Mythic+ Runs last week',
		files: [
			{
				attachment: buffer,
				name: `highest_mythicplus_${today.toISOString()}.txt`,
				description: 'Mythic+ done by raiders last week',
			},
		],
	};
};

const alertHighestMythicPlusDone = async (client) => {
	const raidersLoungeChannel = await client.channels
		.fetch(weeklyCheckChannelId)
		.catch((err) => console.error(err));
	await raidersLoungeChannel
		.send(await getHighestMythicPlusDoneMessage())
		.catch((err) => console.error(err));
};

exports.getHighestMythicPlusDoneMessage = getHighestMythicPlusDoneMessage;
exports.alertHighestMythicPlusDone = alertHighestMythicPlusDone;
