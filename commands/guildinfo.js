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

		await interaction
			.reply({ content: 'Updating Guild Info...' })
			.catch(err => console.error(err));

		await clearGuildInfo(interaction);
		await updateAboutUs(interaction);
		await updateSchedule(interaction);
		await updateRecruitment(interaction);
		await updateAchievements(interaction);

		if (interaction.channelId !== guildInfoChannelId) {
			await wait(1000);
			await interaction
				.deleteReply()
				.catch(err => console.error(err));
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