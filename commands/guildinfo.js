const { SlashCommandBuilder } = require('@discordjs/builders');
const { clearGuildInfo } = require('../functions/guild-info/clearGuildInfo');
const { updateAboutUs } = require('../functions/guild-info/updateAboutUs');
const { updateSchedule } = require('../functions/guild-info/updateSchedule');
const { updateRecruitment } = require('../functions/guild-info/updateRecruitment');
const { updateAchievements } = require('../functions/guild-info/updateAchievements');
const { guildInfoChannelId } = require('../config.json');
const wait = require('util').promisify(setTimeout);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('guildinfo')
		.setDescription('Update for Guild information sections'),
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
};