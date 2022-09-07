const { trialReviewChannelId, databaseString } = require('../../config.json');
const { generateTrialReviewContent } = require('../trial-review/generateTrialReviewContent');
const Keyv = require('keyv');
const { updateTrialLogsContent } = require('./updateTrialLogsContent');
const { updateTrialAlerts } = require('./updateTrialAlerts');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function changeTrialInfo(client, threadId, trial) {
	const existingTrial = await trials
		.get(threadId)
		.catch(err => console.error(err));

	if (existingTrial) {
		trial = {
			...existingTrial,
			characterName: trial.characterName ?? existingTrial.characterName,
			role: trial.role ?? existingTrial.role,
			startDate: trial.startDate ?? existingTrial.startDate,
		};

		const trialReviewChannel = client.channels.cache.get(trialReviewChannelId);

		trialReviewChannel.messages.fetch(trial.trialReviewId)
			.then(message => {
				message.edit(generateTrialReviewContent(trial.characterName, trial.role, trial.startDate, trial.extended));
				message.thread.name = `${trial.characterName} Review`;
			})
			.catch(console.error);

		await updateTrialLogsContent(client, trial);
	}

	await trials
		.set(threadId, trial);
	await updateTrialAlerts(threadId);
}

exports.changeTrialInfo = changeTrialInfo;