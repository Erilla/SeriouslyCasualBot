const { removeTrial } = require('../functions/trial-review/removeTrial');
const { updateTrialInfoModal, createTrialInfoModal } = require('../functions/trial-review/trialInfoModal');
const { createTrialReviewThread } = require('../functions/trial-review/createTrialReviewThread');
const { dateInputValidator } = require('../functions/trial-review/dateInputValidator');
const { changeTrialInfo } = require('../functions/trial-review/changeTrialInfo');
const { archiveApplicationThread } = require('../functions/applications/archiveApplicationThread');
const { voteForApplicant, voteNeutralApplicant, voteAgainstApplicant } = require('../functions/applications/voteApplicant');
const { generateVotingMessage } = require('../functions/applications/generateVotingMessage');
const wait = require('util').promisify(setTimeout);

const adminRoleIds = ['255630010088423425', '170611904752910336'];

function checkPermissions(member) {
	const roles = member.roles.cache;

	let found = false;

	adminRoleIds.forEach(adminRoleId => {
		if (roles.get(adminRoleId)) {
			found = true;
		}
	});

	return found;
}

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
			else if (interaction.customId === 'acceptedApplicant') {
				if (checkPermissions(interaction.member)) {
					await createTrialInfoModal(interaction);
				}
				else {
					await interaction.reply({
						content: 'Insufficent permissions',
						ephemeral: true,
					});
				}
			}
			else if (interaction.customId === 'rejectedApplicant') {
				if (checkPermissions(interaction.member)) {
					await archiveApplicationThread(interaction.client, interaction.message.thread.id, 'Rejected');
				}
				else {
					await interaction.reply({
						content: 'Insufficent permissions',
						ephemeral: true,
					});
				}
			}
			else if (interaction.customId === 'voteFor') {
				await voteForApplicant(interaction.user.id, interaction.channelId);
				await interaction.update(await generateVotingMessage(interaction.channelId));
			}
			else if (interaction.customId === 'voteNeutral') {
				await voteNeutralApplicant(interaction.user.id, interaction.channelId);
				await interaction.update(await generateVotingMessage(interaction.channelId));
			}
			else if (interaction.customId === 'voteAgainst') {
				await voteAgainstApplicant(interaction.user.id, interaction.channelId);
				await interaction.update(await generateVotingMessage(interaction.channelId));
			}
		}
		else if (interaction.isModalSubmit()) {
			if (interaction.customId === 'addNewTrialInfoModal') {
				const characterName = interaction.fields.getTextInputValue('characterNameInput');
				const role = interaction.fields.getTextInputValue('roleInput');
				const startDate = interaction.fields.getTextInputValue('startDateInput');

				if (dateInputValidator(startDate)) {
					await createTrialReviewThread(interaction.client, { characterName, role, startDate: new Date(startDate) });

					if (interaction.message?.thread?.id) {
						await archiveApplicationThread(interaction.client, interaction.message.thread.id, 'Accepted');
					}

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