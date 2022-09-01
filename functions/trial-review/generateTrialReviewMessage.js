const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { generateTrialReviewContent } = require('./generateTrialReviewContent');

const generateTrialReviewMessage = (trial) => {

	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('updateTrialInfo')
				.setLabel('Update')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId('extendTrialByOneWeek')
				.setLabel('Extend Trial by 1 Week')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId('closeTrial')
				.setLabel('Close')
				.setStyle(ButtonStyle.Danger),
		);

	const content = generateTrialReviewContent(trial.characterName, trial.role, trial.startDate, trial.extended);

	return { content: content, components: [row] };
};

exports.generateTrialReviewMessage = generateTrialReviewMessage;