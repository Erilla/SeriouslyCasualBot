const { SlashCommandBuilder } = require('@discordjs/builders');
const { addLootPost } = require('../functions/loot/addLootPost');
const { deleteLootPost } = require('../functions/loot/deleteLootPost');
const {
	checkRaidExpansions,
} = require('../functions/loot/checkRaidExpansions');

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
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('delete_posts')
			.setDescription('Deletes specified loot post')
			.addStringOption((option) =>
				option
					.setName('boss_ids')
					.setDescription('Specified Boss Ids (split by commas)')
					.setRequired(true),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('create_posts')
			.setDescription('Adds the current raids loot post'),
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
		else if (interaction.options.getSubcommand() === 'delete_posts') {
			const bossIds = interaction.options.getString('boss_ids');

			const bossIdsArray = bossIds.split(',');

			const lootPosts = [];

			bossIdsArray.forEach((bossId) => {
				lootPosts.push(deleteLootPost(interaction.client, bossId));
			});

			await interaction
				.reply({
					content: 'Deleting posts',
					ephemeral: true,
				})
				.catch((err) => console.error(err));

			await Promise.all(lootPosts).then(async () => {
				await interaction
					.editReply({
						content: 'Deleted posts',
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			});
		}
		else if (interaction.options.getSubcommand() === 'create_posts') {
			await interaction
				.reply({
					content: 'Checking raid expansions',
					ephemeral: true,
				})
				.catch((err) => console.error(err));

			checkRaidExpansions(interaction.client)
				.then(async () => {
					await interaction
						.editReply({
							content: 'Checked raid expansions',
							ephemeral: true,
						})
						.catch((err) => console.error(err));
				})
				.catch((err) => console.error(err));
		}
	},
};
