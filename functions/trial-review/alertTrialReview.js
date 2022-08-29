const { trialReviewChannelId, databaseString } = require('../../config.json');

const adminRoleId = '255630010088423425';

const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function alertTrialReview(client, threadId, alertName) {

	const trialReviewChannel = await client.channels.fetch(trialReviewChannelId);
	const thread = await trialReviewChannel.threads.fetch(threadId);
	if (thread) {
		await thread.send(`<@&${adminRoleId}> ${alertName}`);
	}
	else {
		console.log(`Could not find Thread ${threadId}`);
	}
}

exports.alertTrialReview = alertTrialReview;