const { SlashCommandBuilder } = require('@discordjs/builders');
const { alertSignups } = require('../functions/raids/alertSignups');

const command = new SlashCommandBuilder()
	.setName('raids')
	.setDescription('Commands surrounding raids')
	.addSubcommand(subcommand =>
		subcommand
			.setName('alert_signups')
			.setDescription('Alert raiders that have not signed to sign up for the next raid'))
	;

module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		if (interaction.options.getSubcommand() === 'alert_signups') {
			await alertSignups(interaction.client)
				.then(async () => {
					await interaction.reply({
						content: 'Not signed Raiders alerted',
						ephemeral: true,
					});
				})
				.catch(async error => {
					await interaction.reply({
						content: error,
						ephemeral: true,
					});
				});
		}
	},
};