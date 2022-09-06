const { trialReviewChannelId, databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { generateTrialReviewMessage } = require('./generateTrialReviewMessage');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function updateTrailReviewMessages(client) {

	// eslint-disable-next-line no-unused-vars
	for await (const [key, value] of trials.iterator()) {
		const trialReviewChannel = await client.channels
			.fetch(trialReviewChannelId)
			.catch(err => console.error(err));
		const trialReviewMessage = await trialReviewChannel.messages
			.fetch(value.trialReviewId)
			.catch(err => console.error(err));

		const newMessageContent = generateTrialReviewMessage(value);

		await trialReviewMessage
			.edit(newMessageContent)
			.catch(err => console.error(err));
	}
}

exports.updateTrailReviewMessages = updateTrailReviewMessages;