const { removeTrial } = require('../functions/trial-review/removeTrial');
const { updateTrialInfoModal } = require('../functions/trial-review/trialInfoModal');
const { createTrialReviewThread } = require('../functions/trial-review/createTrialReviewThread');
const { dateInputValidator } = require('../functions/trial-review/dateInputValidator');
const { changeTrialInfo } = require('../functions/trial-review/changeTrialInfo');
const wait = require('util').promisify(setTimeout);

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {

		if (interaction.isCommand()) {
			console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);
			const executedCommand = interaction.client.commands.get(interaction.commandName);

			if (!executedCommand) return;

			try {
				await executedCommand.execute(interaction);
			}
			catch (error) {
				console.error(error);
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
		else if (interaction.isButton()) {
			if (interaction.customId === 'closeTrial') {
				console.log(`${interaction.user.tag} in #${interaction.channel.name} clicked the closeTrial button.`);

				await removeTrial(interaction.message.thread.id);
				await interaction.message.thread.send('Closing Trial Thread');
				await interaction.message.thread.setArchived(true);

				return interaction.update({
					content: `:red_square: **TRIAL ENDED** :red_square:\n${interaction.message}`,
					components: [],
					ephemeral: true,
				});

			}
			else if (interaction.customId === 'updateTrialInfo') {
				await updateTrialInfoModal(interaction);
			}
		}
		else if (interaction.isModalSubmit()) {
			if (interaction.customId === 'addNewTrialInfoModal') {
				const characterName = interaction.fields.getTextInputValue('characterNameInput');
				const role = interaction.fields.getTextInputValue('roleInput');
				const startDate = interaction.fields.getTextInputValue('startDateInput');

				if (dateInputValidator(startDate)) {
					await createTrialReviewThread(interaction.client, { characterName, role, startDate: new Date(startDate) });

					await interaction.reply({
						content: 'Successfully created Trial Thread',
					});
					await wait(1000);
					await interaction.deleteReply();
				}
				else {
					await interaction.reply({
						content: 'Invalid Date',
					});
					await wait(1000);
					await interaction.deleteReply();
				}
			}
			else if (interaction.customId === 'updateTrialInfoModal') {
				const threadId = interaction.message.thread.id;
				const characterName = interaction.fields.getTextInputValue('characterNameInput');
				const role = interaction.fields.getTextInputValue('roleInput');
				const startDate = interaction.fields.getTextInputValue('startDateInput');

				const trial = {
					characterName,
					role,
					startDate,
				};

				await changeTrialInfo(interaction.client, threadId, trial);

				await interaction.reply({
					content: `Successfully updated Trial with thread Id ${threadId}`,
				});

				await wait(1000);
				await interaction.deleteReply();
			}
		}

	},
};