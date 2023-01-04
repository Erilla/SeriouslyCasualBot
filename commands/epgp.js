const { SlashCommandBuilder } = require('@discordjs/builders');
const {
	createPriorityRankingPost,
	updatePriorityRankingPost,
} = require('../functions/epgp/priorityRankingPost');

const command = new SlashCommandBuilder()
	.setName('epgp')
	.setDescription('Commands around the EPGP')
	.addSubcommand((subcommand) =>
		subcommand
			.setName('update_priority_post')
			.setDescription('Updates the priority post')
			.addBooleanOption((option) =>
				option.setName('create_post').setDescription('Creates the post'),
			),
	);

module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		if (interaction.options.getSubcommand() === 'update_priority_post') {
			const createPost = interaction.options.getBoolean('create_post');

			await interaction
				.reply({
					content: `${createPost ? 'Creating' : 'Updating'} Priority post...`,
					ephemeral: true,
				})
				.catch((err) => console.error(err));

			createPost
				? await createPriorityRankingPost(interaction)
				: await updatePriorityRankingPost(interaction.client, interaction);
		}
	},
};
