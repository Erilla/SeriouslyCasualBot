const { trialReviewChannelId, databaseString } = require('../../config.json');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { generateTrialReviewContent } = require('./generateTrialReviewContent');
const { changeTrialInfo } = require('./changeTrialInfo');
const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

// Trial == { characterName, role, startDate, }

async function createTrialReviewThread(client, trial) {
	console.log(`Creating trial thread for ${trial.characterName}...`);

	// Find Trial Reviews channel
	const trialReviewChannel = await client.channels.fetch(trialReviewChannelId);

	// Send message to channel
	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('updateTrialInfo')
				.setLabel('Update')
				.setStyle(ButtonStyle.Primary),
		)
		.addComponents(
			new ButtonBuilder()
				.setCustomId('closeTrial')
				.setLabel('Close')
				.setStyle(ButtonStyle.Danger),
		);

	const content = generateTrialReviewContent(trial.characterName, trial.role, trial.startDate);

	trialReviewChannel.send({ content: content, components: [row] })
		.then(async message => {
			const thread = await message.startThread({
				name: `${trial.characterName} Review`,
			});

			trial.trialReviewId = message.id;

			await changeTrialInfo(client, thread.id, trial);

			// thread.send('Logs:');
		})
		.catch(console.error);

}

exports.createTrialReviewThread = createTrialReviewThread;