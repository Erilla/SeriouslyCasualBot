const { removeTrial } = require('../functions/trial-review/removeTrial');

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
					content: `**TRIAL ENDED**\n${interaction.message}`,
					components: [],
					ephemeral: true,
				});

			}
		}

	},
};