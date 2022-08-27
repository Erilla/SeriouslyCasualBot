const { trialReviewChannelId, databaseString } = require('../../config.json');
const { generateTrialReviewContent } = require('../trial-review/generateTrialReviewContent');
const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function changeTrialInfo(client, threadId, trial) {
	const existingTrial = await trials.get(threadId);

	if (existingTrial) {
		trial = {
			characterName: trial.characterName ?? existingTrial.characterName,
			role: trial.role ?? existingTrial.role,
			startDate: trial.startDate ?? existingTrial.startDate,
			trialReviewId: existingTrial.trialReviewId,
		};

		const trialReviewChannel = client.channels.cache.get(trialReviewChannelId);

		trialReviewChannel.messages.fetch(trial.trialReviewId)
			.then(message => {
				message.edit(generateTrialReviewContent(trial.characterName, trial.role, trial.startDate));
			})
			.catch(console.error);
	}

	await trials.set(threadId, trial);
}

exports.changeTrialInfo = changeTrialInfo;