const { SlashCommandBuilder } = require('@discordjs/builders');
const {
	generatePriorityRankingsPost,
} = require('../functions/epgp/priorityRankingPost');

const command = new SlashCommandBuilder()
	.setName('epgp')
	.setDescription('Commands around the EPGP')
	.addSubcommand((subcommand) =>
		subcommand
			.setName('get_by_token')
			.setDescription('Updates the priority post')
			.addStringOption((option) =>
				option
					.setName('tier_token')
					.setDescription('Filter by tier token')
					.setRequired(true)
					.setChoices(
						{
							name: 'Zenith (Evoker, Monk, Rogue, Warrior)',
							value: 'Zenith',
						},
						{
							name: 'Dreadful (Death Knight, Demon Hunter, Warlock)',
							value: 'Dreadful',
						},
						{
							name: 'Mystic (Druid, Hunter, Mage)',
							value: 'Mystic',
						},
						{
							name: 'Venerated (Paladin, Priest, Shaman)',
							value: 'Venerated',
						},
					),
			),
	);

module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		if (interaction.options.getSubcommand() === 'get_by_token') {
			const tierToken = interaction.options.getString('tier_token');

			await interaction
				.reply({
					content: `Retrieving rankings by ${tierToken} token...`,
					ephemeral: true,
				})
				.catch((err) => console.error(err));

			const post = await generatePriorityRankingsPost(tierToken);
			await interaction
				.editReply({
					content: post,
					ephemeral: true,
				})
				.catch((err) => console.error(err));
		}
	},
};
