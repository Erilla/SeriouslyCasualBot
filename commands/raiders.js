const { SlashCommandBuilder } = require('@discordjs/builders');
const { addRaider } = require('../functions/raids/addRaider');
const { addRaiders } = require('../functions/raids/addRaiders');
const { getRaiders } = require('../functions/raids/getRaiders');
const { removeRaider } = require('../functions/raids/removeRaider');
const { updateRaider } = require('../functions/raids/updateRaider');
const { updateRaiderJsonData } = require('../functions/raids/updateRaiderJsonData');

const command = new SlashCommandBuilder()
	.setName('raiders')
	.setDescription('Commands surrounding raiders')
	.addSubcommand(subcommand =>
		subcommand
			.setName('add_raiders')
			.setDescription('Re-seeds raiders into database')
			.addBooleanOption(option =>
				option.setName('use_seed_data')
					.setDescription('Use Seed Data?')))
	.addSubcommand(subcommand =>
		subcommand
			.setName('add_raider')
			.setDescription('Adds specified raider')
			.addStringOption(option =>
				option.setName('character_name')
					.setDescription('Character name of the raider')
					.setRequired(true))
			.addUserOption(option =>
				option.setName('user')
					.setDescription('Discord user of the raider')
					.setRequired(true)))
	.addSubcommand(subcommand =>
		subcommand
			.setName('get_raiders')
			.setDescription('Returns list of current raiders'))
	.addSubcommand(subcommand =>
		subcommand
			.setName('remove_raider')
			.setDescription('Removes speified raider')
			.addStringOption(option =>
				option.setName('character_name')
					.setDescription('Character name of the raider')
					.setRequired(true)))
	.addSubcommand(subcommand =>
		subcommand
			.setName('update_raider')
			.setDescription('Updates specified raider')
			.addStringOption(option =>
				option.setName('old_character_name')
					.setDescription('Previous character name of the raider')
					.setRequired(true))
			.addStringOption(option =>
				option.setName('new_character_name')
					.setDescription('New character name of the raider')
					.setRequired(true)))
	.addSubcommand(subcommand =>
		subcommand
			.setName('update_raider_seeddata')
			.setDescription('Updates raiders seed data'))
	;

module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		if (interaction.options.getSubcommand() === 'add_raider') {
			const character_name = interaction.options.getString('character_name');
			const user = interaction.options.getUser('user');

			if (await addRaider(character_name, user.id).catch(err => console.error(err))) {
				await interaction
					.reply({
						content: `Successfully added ${character_name} ${user.id}`,
						ephemeral: true,
					})
					.catch(err => console.error(err));
			}
			else {
				await interaction
					.reply({
						content: `Error: Did not add raider ${character_name} ${user.id}`,
						ephemeral: true,
					})
					.catch(err => console.error(err));
			}
		}
		else if (interaction.options.getSubcommand() === 'add_raiders') {
			const useSeedData = interaction.options.getBoolean('use_seed_data');

			await addRaiders(true, useSeedData)
				.then(async () => {
					await interaction.reply({
						content: 'Successfully re-seeded raiders',
						ephemeral: true,
					});
				})
				.catch(async (error) => {
					await interaction.reply({
						content: error,
						ephemeral: true,
					});
				});
		}
		else if (interaction.options.getSubcommand() === 'get_raiders') {
			await interaction
				.reply({
					content: JSON.stringify(await getRaiders().catch(err => console.error(err)), null, 2),
					ephemeral: true,
				})
				.catch(err => console.error(err));
		}
		else if (interaction.options.getSubcommand() === 'remove_raider') {
			const character_name = interaction.options.getString('character_name');

			if (await removeRaider(character_name).catch(err => console.error(err))) {
				await interaction
					.reply({
						content: `Successfully remove raider ${character_name}`,
						ephemeral: true,
					})
					.catch(err => console.error(err));
			}
			else {
				await interaction
					.reply({
						content: `Error: Did not remove raider ${character_name}`,
						ephemeral: true,
					})
					.catch(err => console.error(err));
			}
		}
		else if (interaction.options.getSubcommand() === 'update_raider') {
			const oldCharacterName = interaction.options.getString('old_character_name');
			const newCharacterName = interaction.options.getString('new_character_name');

			if (await updateRaider(oldCharacterName, newCharacterName).catch(err => console.error(err))) {
				await interaction
					.reply({
						content: `Successfully updated ${oldCharacterName} with ${newCharacterName}`,
						ephemeral: true,
					})
					.catch(err => console.error(err));
			}
			else {
				await interaction
					.reply({
						content: `Error: Did not updated ${oldCharacterName} with ${newCharacterName}`,
						ephemeral: true,
					})
					.catch(err => console.error(err));
			}
		}
		else if (interaction.options.getSubcommand() === 'update_raider_seeddata') {

			await updateRaiderJsonData()
				.catch(err => console.error(err));

			await interaction
				.editReply({
					content: 'Updated Raider Seed Data',
					ephemeral: true,
				})
				.catch(err => console.error(err));
		}
	},
};