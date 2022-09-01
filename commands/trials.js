const { SlashCommandBuilder } = require('@discordjs/builders');
const { createTrialInfoModal } = require('../functions/trial-review/trialInfoModal');
const { getCurrentTrials } = require('../functions/trial-review/getCurrentTrials');
const { removeTrial } = require('../functions/trial-review/removeTrial');
const { changeTrialInfo } = require('../functions/trial-review/changeTrialInfo');
const { updateTrialLogs } = require('../functions/trial-review/updateTrialLogs');
const { updateTrailReviewMessages } = require('../functions/trial-review/updateTrailReviewMessages');

const command = new SlashCommandBuilder()
	.setName('trials')
	.setDescription('Commands surrounding trials')
	.addSubcommand(subcommand =>
		subcommand
			.setName('create_thread')
			.setDescription('Creates a trial review thread'))
	.addSubcommand(subcommand =>
		subcommand
			.setName('get_current_trials')
			.setDescription('Returns a list of current trials and their start dates'))
	.addSubcommand(subcommand =>
		subcommand
			.setName('remove_trial')
			.setDescription('Removes specified trial with thread id')
			.addStringOption(option =>
				option.setName('thread_id')
					.setDescription('Thread ID of the trial to be removed')
					.setRequired(true)))
	.addSubcommand(subcommand =>
		subcommand
			.setName('change_trial_info')
			.setDescription('Changes a specified trials info with thread id')
			.addStringOption(option =>
				option.setName('thread_id')
					.setDescription('Thread ID of the trial to be removed')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('character_name')
					.setDescription('The character name of the trial'))
			.addStringOption(option =>
				option.setName('role')
					.setDescription('The role of the trial (Resto druid etc.)'))
			.addStringOption(option =>
				option.setName('start_date')
					.setDescription('The start date of the trial (in YYYY-MM-DD)')))
	.addSubcommand(subcommand =>
		subcommand
			.setName('update_trial_logs')
			.setDescription('Updates all messages with trial logs'))
	.addSubcommand(subcommand =>
		subcommand
			.setName('update_trial_review_messages')
			.setDescription('Updates all trial review messages'))
	;

module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		if (interaction.options.getSubcommand() === 'create_thread') {
			await createTrialInfoModal(interaction);
		}
		else if (interaction.options.getSubcommand() === 'get_current_trials') {
			await interaction.reply({
				content: await getCurrentTrials(),
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'remove_trial') {
			const threadId = interaction.options.getString('thread_id');

			if (removeTrial(threadId)) {
				await interaction.reply({
					content: `Successfully removed Trial with thread Id ${threadId}`,
					ephemeral: true,
				});
			}
			else {
				await interaction.reply({
					content: `Error: Did not remove Trial with thread Id ${threadId}`,
					ephemeral: true,
				});
			}
		}
		else if (interaction.options.getSubcommand() === 'change_trial_info') {
			const threadId = interaction.options.getString('thread_id');
			const characterName = interaction.options.getString('character_name');
			const role = interaction.options.getString('role');
			const startDate = interaction.options.getString('start_date');

			const trial = {
				characterName,
				role,
				startDate,
			};

			await changeTrialInfo(interaction.client, threadId, trial);

			await interaction.reply({
				content: `Successfully updated Trial with thread Id ${threadId}`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'update_trial_logs') {

			await updateTrialLogs(interaction.client);

			await interaction.reply({
				content: 'Trial Logs updated',
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'update_trial_review_messages') {

			await interaction.reply({
				content: 'Updating Trial Review Messages...',
				ephemeral: true,
			});

			await updateTrailReviewMessages(interaction.client);

			await interaction.editReply({
				content: 'Trial Review Messages updated',
				ephemeral: true,
			});
		}
	},
};