const { trialReviewChannelId, databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { generateTrialLogsContent } = require('./generateTrialLogsContent');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function updateTrialLogsContent(client, trial) {

	const trialReviewChannel = await client.channels
		.fetch(trialReviewChannelId)
		.catch(err => console.error(err));
	const trialReviewMessage = await trialReviewChannel.messages
		.fetch(trial.trialReviewId)
		.catch(err => console.error(err));
	if (trial.trialLogsId) {
		const trialLogsMessage = await trialReviewMessage.thread.messages
			.fetch(trial.trialLogsId)
			.catch(err => console.error(err));
		await trialLogsMessage
			.edit(await generateTrialLogsContent(trial).catch(err => console.error(err)))
			.catch(err => console.error(err));
		console.log(`Updated Trial Log Message for ${trial.characterName}`);
	}
	else {
		console.log(`Cannot find Trial Log Message for ${trial.characterName}`);
	}
}

exports.updateTrialLogsContent = updateTrialLogsContent;