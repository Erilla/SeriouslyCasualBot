const { trialReviewChannelId, databaseString } = require('../../config.json');
const { generateTrialLogsContent } = require('./generateTrialLogsContent');
const { changeTrialInfo } = require('./changeTrialInfo');
const Keyv = require('keyv');
const { addOverlordsToThread } = require('../addOverlordsToThread');
const { generateTrialReviewMessage } = require('./generateTrialReviewMessage');
const { ThreadAutoArchiveDuration } = require('discord.js');

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

			thread.setAutoArchiveDuration(ThreadAutoArchiveDuration.OneWeek);

			trial.trialReviewId = message.id;

			const trialLogsContent = await generateTrialLogsContent(trial);
			const trialLogsMessage = await thread
				.send(trialLogsContent)
				.catch(err => console.error(err));
			trial.trialLogsId = trialLogsMessage.id;
			await trialLogsMessage.pin();

			await changeTrialInfo(client, thread.id, trial);

			await addOverlordsToThread(thread);
		})
		.catch(console.error);

}

exports.createTrialReviewThread = createTrialReviewThread;