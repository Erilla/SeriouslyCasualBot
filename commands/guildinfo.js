const { SlashCommandBuilder } = require('@discordjs/builders');
const { clearGuildInfo } = require('../functions/guild-info/clearGuildInfo');
const { updateAboutUs } = require('../functions/guild-info/updateAboutUs');
const { updateSchedule } = require('../functions/guild-info/updateSchedule');
const { updateRecruitment } = require('../functions/guild-info/updateRecruitment');
const { updateAchievements } = require('../functions/guild-info/updateAchievements');
const { guildInfoChannelId, adminRoleId } = require('../config.json');
const wait = require('util').promisify(setTimeout);

const command = new SlashCommandBuilder()
	.setName('guildinfo')
	.setDescription('Update for Guild information sections')
	.setDefaultPermission(false);

module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		await interaction.reply({ content: 'Updating Guild Info...' });

		clearGuildInfo(interaction);
		updateAboutUs(interaction);
		updateSchedule(interaction);
		updateRecruitment(interaction);
		updateAchievements(interaction);

		if (interaction.channelId !== guildInfoChannelId) {
			await wait(1000);
			await interaction.deleteReply();
		}
	},
	permissions: [
		{
			id: adminRoleId,
			type: 1,
			permission: true,
		},
	],
};