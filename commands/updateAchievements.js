const { SlashCommandBuilder } = require('@discordjs/builders');
const { updateAchievements } = require('../functions/guild-info/updateAchievements');
const { adminRoleId } = require('../config.json');
const wait = require('util').promisify(setTimeout);

const command = new SlashCommandBuilder()
	.setName('updateachievements')
	.setDescription('Updates achievements')
	.setDefaultPermission(false);

module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		await interaction.reply({ content: 'Updates achievements...' });

		updateAchievements(interaction);

		await wait(1000);
		await interaction.deleteReply();
	},
	permissions: [
		{
			id: adminRoleId,
			type: 1,
			permission: true,
		},
	],
};