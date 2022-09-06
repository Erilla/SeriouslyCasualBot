const { SlashCommandBuilder } = require('@discordjs/builders');
const { createVotingThreadMessage } = require('../functions/applications/createVotingThreadMessage');

const command = new SlashCommandBuilder()
	.setName('applicants')
	.setDescription('Commands surrounding applicants')
	.addSubcommand(subcommand =>
		subcommand
			.setName('create_voting_message')
			.setDescription('Creates a voting message for an applicant')
			.addStringOption(option =>
				option.setName('thread_id')
					.setDescription('Thread ID of the applicant to add to')
					.setRequired(true)))
	;

module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		if (interaction.options.getSubcommand() === 'create_voting_message') {
			const threadId = interaction.options.getString('thread_id');

			if (
				await createVotingThreadMessage(interaction.client, threadId)
					.catch(err => console.error(err))
			) {
				await interaction
					.reply({
						content: `Successfully added voting message to thread Id ${threadId}`,
						ephemeral: true,
					})
					.catch(err => console.error(err));
			}
			else {
				await interaction
					.reply({
						content: `Error: Did not add voting message to thread Id ${threadId}`,
						ephemeral: true,
					})
					.catch(err => console.error(err));
			}
		}
	},
};