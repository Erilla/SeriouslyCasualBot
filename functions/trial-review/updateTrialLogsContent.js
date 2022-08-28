const { trialReviewChannelId, databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { generateTrialLogsContent } = require('./generateTrialLogsContent');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function updateTrialLogsContent(client, trial) {

	const trialReviewChannel = await client.channels.fetch(trialReviewChannelId);
	const trialReviewMessage = await trialReviewChannel.messages.fetch(trial.trialReviewId);
	if (trial.trialLogsId) {
		const trialLogsMessage = await trialReviewMessage.thread.messages.fetch(trial.trialLogsId);
		await trialLogsMessage.edit(await generateTrialLogsContent(trial));
		console.log(`Updated Trial Log Message for ${trial.characterName}`);
	}
	else {
		console.log(`Cannot find Trial Log Message for ${trial.characterName}`);
	}
}

exports.updateTrialLogsContent = updateTrialLogsContent;