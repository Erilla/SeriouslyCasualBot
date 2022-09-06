const { trialReviewChannelId, databaseString } = require('../../config.json');

const adminRoleId = '255630010088423425';

const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function alertTrialReview(client, threadId, alertName) {

	const trialReviewChannel = await client.channels
		.fetch(trialReviewChannelId)
		.catch(err => console.error(err));
	const thread = await trialReviewChannel.threads
		.fetch(threadId)
		.catch(err => console.error(err));
	if (thread) {
		await thread
			.send(`<@&${adminRoleId}> ${alertName}`)
			.catch(err => console.error(err));
	}
	else {
		console.log(`Could not find Thread ${threadId}`);
	}
}

exports.alertTrialReview = alertTrialReview;