const { trialReviewChannelId, databaseString } = require('../../config.json');

const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function keepTrialThreadAlive(client, threadId) {

	const trialReviewChannel = await client.channels.fetch(trialReviewChannelId);
	const thread = await trialReviewChannel.threads.fetch(threadId);
	if (thread) {
		if (thread.archived) {
			thread.setArchived(false)
				.then(newThread => console.log(`Keeping Thread Id ${newThread.id} alive`))
				.catch(console.error);
		}
	}
	else {
		console.log(`Could not find Thread ${threadId}`);
	}
}

exports.keepTrialThreadAlive = keepTrialThreadAlive;