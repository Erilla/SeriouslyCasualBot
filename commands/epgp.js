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
			.setDescription(
				'Returns a table containing EPGP filtered by specified token type',
			)
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
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('get_by_armour')
			.setDescription(
				'Returns a table containing EPGP filtered by specified armour type',
			)
			.addStringOption((option) =>
				option
					.setName('armour_type')
					.setDescription('Filter by armour Type')
					.setRequired(true)
					.setChoices(
						{
							name: 'Cloth',
							value: 'Cloth',
						},
						{
							name: 'Leather',
							value: 'Leather',
						},
						{
							name: 'Mail',
							value: 'Mail',
						},
						{
							name: 'Plate',
							value: 'Plate',
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
		else if (interaction.options.getSubcommand() === 'get_by_armour') {
			const armourType = interaction.options.getString('armour_type');

			await interaction
				.reply({
					content: `Retrieving rankings by ${armourType}...`,
					ephemeral: true,
				})
				.catch((err) => console.error(err));

			const post = await generatePriorityRankingsPost(null, armourType);
			await interaction
				.editReply({
					content: post,
					ephemeral: true,
				})
				.catch((err) => console.error(err));
		}
	},
};
