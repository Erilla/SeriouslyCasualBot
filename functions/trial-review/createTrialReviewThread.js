const { trialReviewChannelId, databaseString } = require('../../config.json');
const { generateTrialLogsContent } = require('./generateTrialLogsContent');
const { changeTrialInfo } = require('./changeTrialInfo');
const Keyv = require('keyv');
const { addOverlordsToThread } = require('../addOverlordsToThread');
const { generateTrialReviewMessage } = require('./generateTrialReviewMessage');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

// Trial == { characterName, role, startDate, }

async function createTrialReviewThread(client, trial) {
	console.log(`Creating trial thread for ${trial.characterName}...`);

	// Find Trial Reviews channel
	const trialReviewChannel = await client.channels
		.fetch(trialReviewChannelId)
		.catch(err => console.error(err));

	// Send message to channel
	const trialReviewMessage = generateTrialReviewMessage(trial);

	trialReviewChannel.send(trialReviewMessage)
		.then(async message => {
			const thread = await message
				.startThread({
					name: `${trial.characterName} Review`,
				})
				.catch(err => console.error(err));

			trial.trialReviewId = message.id;

			const trialLogsContent = await generateTrialLogsContent(trial)
				.catch(err => console.error(err));
			const trialLogsMessage = await thread
				.send(trialLogsContent)
				.catch(err => console.error(err));
			trial.trialLogsId = trialLogsMessage.id;

			await changeTrialInfo(client, thread.id, trial)
				.catch(err => console.error(err));

			await addOverlordsToThread(thread)
				.catch(err => console.error(err));
		})
		.catch(console.error);

}

exports.createTrialReviewThread = createTrialReviewThread;