const { SlashCommandBuilder } = require('@discordjs/builders');
const { addOverlord } = require('../functions/raids/addOverlord');
const { getRaiders } = require('../functions/raids/getRaiders');
const { syncRaiders } = require('../functions/raids/syncRaiders');
const { sendAlertForRaidersWithNoUser } = require('../functions/raids/sendAlertForRaidersWithNoUser');
const { getOverlords } = require('../functions/raids/getOverlords');
const { removeOverlord } = require('../functions/raids/removeOverlord');
const { updateRaiderDiscordUser } = require('../functions/raids/updateRaiderDiscordUser');
const {
	getPreviousWeekMythicPlusMessage, getPreviousWeeklyGreatVaultMessage,
} = require('../functions/raids/alertHighestMythicPlusDone');
const { getHistoricalData } = require('../services/wowauditService');
const { getIgnoredCharacters, ignoreCharacter, removeIgnoredCharacter } = require('../functions/raids/ignoreCharacter');

const command = new SlashCommandBuilder()
	.setName('raiders')
	.setDescription('Commands surrounding raiders')
	.addSubcommand((subcommand) =>
		subcommand
			.setName('get_raiders')
			.setDescription('Returns list of current raiders'),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('get_ignored_characters')
			.setDescription('Returns list of ignored characters'),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('ignore_character')
			.setDescription('Ignores character for sync raiders')
			.addStringOption((option) =>
				option
					.setName('character_name')
					.setDescription('Character name of the raider')
					.setRequired(true),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('remove_ignore_character')
			.setDescription('Remove specified ignored character')
			.addStringOption((option) =>
				option
					.setName('character_name')
					.setDescription('Character name of the raider')
					.setRequired(true),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('sync_raiders')
			.setDescription('Syncs raiders with BattleNet roster'),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('check_missing_users')
			.setDescription('Checks for raiders with missing users'),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('update_raider_user')
			.setDescription('Updates specified raiders user id')
			.addStringOption((option) =>
				option
					.setName('character_name')
					.setDescription('Character name of the raider')
					.setRequired(true),
			)
			.addUserOption((option) =>
				option
					.setName('user')
					.setDescription('Discord user of the raider')
					.setRequired(true),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('previous_highest_mythicplus')
			.setDescription(
				'Returns the highest mythic plus dungeon each raider has completed',
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('previous_great_vault')
			.setDescription(
				'Returns the previous great vault each raider has completed',
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('add_overlord')
			.setDescription('Adds specified user as overlord')
			.addStringOption((option) =>
				option
					.setName('name')
					.setDescription('name of the user')
					.setRequired(true),
			)
			.addUserOption((option) =>
				option
					.setName('user')
					.setDescription('Discord user of the raider')
					.setRequired(true),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('get_overlords')
			.setDescription('Returns list of current overlords'),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('remove_overlord')
			.setDescription('Removes speified overlord')
			.addStringOption((option) =>
				option
					.setName('name')
					.setDescription('Character name of the overlord')
					.setRequired(true),
			),
	);
module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		if (interaction.options.getSubcommand() === 'get_raiders') {
			await interaction
				.reply({
					content: `${await getRaiders()}`,
					ephemeral: true,
				})
				.catch((err) => console.error(err));
		}
		else if (interaction.options.getSubcommand() === 'get_ignored_characters') {
			await interaction
				.reply({
					content: `${await getIgnoredCharacters()}`,
					ephemeral: true,
				})
				.catch((err) => console.error(err));
		}
		else if (interaction.options.getSubcommand() === 'ignore_character') {
			const character_name = interaction.options.getString('character_name');

			if (await ignoreCharacter(character_name)) {
				await interaction
					.reply({
						content: `Successfully ignored character ${character_name}`,
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			}
			else {
				await interaction
					.reply({
						content: `Error: Did not ignore character ${character_name}`,
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			}
		}
		else if (interaction.options.getSubcommand() === 'remove_ignore_character') {
			const character_name = interaction.options.getString('character_name');

			if (await removeIgnoredCharacter(character_name)) {
				await interaction
					.reply({
						content: `Successfully removed ignored character ${character_name}`,
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			}
			else {
				await interaction
					.reply({
						content: `Error: Did not remove ignored character ${character_name}`,
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			}
		}
		else if (interaction.options.getSubcommand() === 'sync_raiders') {
			await syncRaiders(interaction.client);
			await interaction
				.reply({
					content: `${await getRaiders()}`,
					ephemeral: true,
				})
				.catch((err) => console.error(err));
		}
		else if (interaction.options.getSubcommand() === 'check_missing_users') {
			await sendAlertForRaidersWithNoUser(interaction.client);
			await interaction
				.reply({
					content: 'Success!',
					ephemeral: true,
				})
				.catch((err) => console.error(err));
		}
		else if (interaction.options.getSubcommand() === 'update_raider_user') {
			const character_name = interaction.options.getString('character_name');
			const user = interaction.options.getUser('user');

			if (await updateRaiderDiscordUser(character_name, user.id)) {
				await interaction
					.reply({
						content: `Successfully updated ${character_name} ${user.id}`,
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			}
			else {
				await interaction
					.reply({
						content: `Error: Did not updated raider ${character_name} ${user.id}`,
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			}
		}
		else if (
			interaction.options.getSubcommand() === 'previous_highest_mythicplus'
		) {
			await interaction
				.reply({
					content: 'Retrieving runs...',
				})
				.catch((err) => console.error(err));
			const data = await getHistoricalData();
			const message = await getPreviousWeekMythicPlusMessage(data);

			await interaction.editReply(message).catch((err) => console.error(err));
		}
		else if (
			interaction.options.getSubcommand() === 'previous_great_vault'
		) {
			await interaction
				.reply({
					content: 'Retrieving runs...',
				})
				.catch((err) => console.error(err));
			const data = await getHistoricalData();
			const message = await getPreviousWeeklyGreatVaultMessage(data);

			await interaction.editReply(message).catch((err) => console.error(err));
		}
		else if (interaction.options.getSubcommand() === 'add_overlord') {
			const name = interaction.options.getString('name');
			const user = interaction.options.getUser('user');

			if (await addOverlord(name, user.id)) {
				await interaction
					.reply({
						content: `Successfully added ${name} ${user.id}`,
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			}
			else {
				await interaction
					.reply({
						content: `Error: Did not add ${name} ${user.id}`,
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			}
		}
		else if (interaction.options.getSubcommand() === 'get_overlords') {
			await interaction
				.reply({
					content: `${await getOverlords()}`,
					ephemeral: true,
				})
				.catch((err) => console.error(err));
		}
		else if (interaction.options.getSubcommand() === 'remove_overlords') {
			const name = interaction.options.getString('name');

			if (await removeOverlord(name)) {
				await interaction
					.reply({
						content: `Successfully remove overlord ${name}`,
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			}
			else {
				await interaction
					.reply({
						content: `Error: Did not remove overlord ${name}`,
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			}
		}
	},
};
