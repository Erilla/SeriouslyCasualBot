const { SlashCommandBuilder } = require('@discordjs/builders');
const { createTrialReviewThread } = require('../functions/trial-review/createTrialReviewThread');
const { getCurrentTrials } = require('../functions/trial-review/getCurrentTrials');
const { removeTrial } = require('../functions/trial-review/removeTrial');
const { changeTrialInfo } = require('../functions/trial-review/changeTrialInfo');
const wait = require('util').promisify(setTimeout);

const command = new SlashCommandBuilder()
	.setName('trials')
	.setDescription('Commands surrounding trials')
	.addSubcommand(subcommand =>
		subcommand
			.setName('create_thread')
			.setDescription('Creates a trial review thread')
			.addStringOption(option =>
				option.setName('character_name')
					.setDescription('The character name of the trial')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('role')
					.setDescription('The role of the trial (Resto druid etc.)')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('start_date')
					.setDescription('The start date of the trial (in YYYY-MM-DD)')
					.setRequired(true)))
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
	;

function ValidateDateInput(date) {
	const dateRegex = new RegExp('^\\d{4}\\-(0[1-9]|1[012])\\-(0[1-9]|[12][0-9]|3[01])$');
	return dateRegex.exec(date);
}

module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		if (interaction.options.getSubcommand() === 'create_thread') {
			await interaction.reply({
				content: 'Creating thread...',
			});

			const characterName = interaction.options.getString('character_name');
			const role = interaction.options.getString('role');
			const startDate = interaction.options.getString('start_date');

			if (ValidateDateInput(startDate)) {
				createTrialReviewThread(interaction.client, { characterName, role, startDate: new Date(startDate) });

				await wait(1000);
				await interaction.deleteReply();
			}
			else {
				await interaction.editReply({
					content: 'Invalid Date',
					ephemeral: true,
				});
			}
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
	},
};