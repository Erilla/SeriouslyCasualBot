const { SlashCommandBuilder } = require('@discordjs/builders');
const { addLootPost } = require('../functions/loot/addLootPost');
const { deleteLootPost } = require('../functions/loot/deleteLootPost');

const command = new SlashCommandBuilder()
	.setName('loot')
	.setDescription('Commands around the loot')
	.addSubcommand((subcommand) =>
		subcommand.setName('add_post').setDescription('Adds a test loot post'),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('delete_post')
			.setDescription('Deletes specified loot post')
			.addIntegerOption((option) =>
				option
					.setName('boss_id')
					.setDescription('Specified Boss Id')
					.setRequired(true),
			),
	);

module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		if (interaction.options.getSubcommand() === 'add_post') {
			const boss = {
				id: 1,
				name: 'Test Boss',
				url: 'http://www.google.com',
			};

			await addLootPost(interaction.channel, boss);
			await interaction
				.reply({
					content: 'Post added',
					ephemeral: true,
				})
				.catch((err) => console.error(err));
		}
		else if (interaction.options.getSubcommand() === 'delete_post') {
			const bossId = interaction.options.getInteger('boss_id');

			await deleteLootPost(interaction.client, bossId)
				.then(async () => {
					await interaction
						.reply({
							content: 'Loot post removed',
							ephemeral: true,
						})
						.catch((err) => console.error(err));
				})
				.catch((err) => console.error(err));
		}
	},
};
