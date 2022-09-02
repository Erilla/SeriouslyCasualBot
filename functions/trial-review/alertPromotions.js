const { trialReviewChannelId, databaseString } = require('../../config.json');

const adminRoleId = '255630010088423425';

const Keyv = require('keyv');

const promoteAlerts = new Keyv(databaseString, { namespace: 'promoteAlerts' });
promoteAlerts.on('error', err => console.error('Keyv connection error:', err));

async function alertPromotions(client) {
	const alerted = [];

	// eslint-disable-next-line no-unused-vars
	for await (const [key, value] of promoteAlerts.iterator()) {
		const threadId = key;
		const date = new Date(value);

		if (date < new Date()) {
			const trialReviewChannel = await client.channels.fetch(trialReviewChannelId);
			const thread = await trialReviewChannel.threads.fetch(threadId);

			if (thread) {
				await thread.send(`<@&${adminRoleId}> Promotion time!`);
				alerted.push(threadId);
			}
			else {
				console.log(`Could not find Thread ${threadId}`);
			}
		}
	}

	alerted.forEach(async id => {
		await promoteAlerts.delete(id);
	});
}

exports.alertPromotions = alertPromotions;