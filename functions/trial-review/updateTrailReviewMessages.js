const { trialReviewChannelId, databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { generateTrialReviewMessage } = require('./generateTrialReviewMessage');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function updateTrailReviewMessages(client) {

	// eslint-disable-next-line no-unused-vars
	for await (const [key, value] of trials.iterator()) {
		const trialReviewChannel = await client.channels.fetch(trialReviewChannelId);
		const trialReviewMessage = await trialReviewChannel.messages.fetch(value.trialReviewId);

		const newMessageContent = generateTrialReviewMessage(value);

		await trialReviewMessage.edit(newMessageContent);
	}
}

exports.updateTrailReviewMessages = updateTrailReviewMessages;