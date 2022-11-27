const { SlashCommandBuilder } = require('@discordjs/builders');
const { settings } = require('../functions/settings/settings');
const { getSettings } = require('../functions/settings/getSettings');
const { setSetting } = require('../functions/settings/setSetting');

const command = new SlashCommandBuilder()
	.setName('settings')
	.setDescription('Commands for settings')
	.addSubcommand((subcommand) =>
		subcommand
			.setName('get_setting')
			.setDescription('Returns the current settings')
			.addStringOption((option) =>
				option
					.setName('setting_name')
					.setDescription('Setting name')
					.setRequired(true)
					.setChoices(
						{
							name: settings.alertSignup_Wednesday,
							value: settings.alertSignup_Wednesday,
						},
						{
							name: settings.alertSignup_Wednesday_48,
							value: settings.alertSignup_Wednesday_48,
						},
						{
							name: settings.alertSignup_Sunday,
							value: settings.alertSignup_Sunday,
						},
						{
							name: settings.alertSignup_Sunday_48,
							value: settings.alertSignup_Sunday_48,
						},
					),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName('toggle_setting')
			.setDescription('Toggles given settings')
			.addStringOption((option) =>
				option
					.setName('setting_name')
					.setDescription('Setting name')
					.setRequired(true)
					.setChoices(
						{
							name: settings.alertSignup_Wednesday,
							value: settings.alertSignup_Wednesday,
						},
						{
							name: settings.alertSignup_Wednesday_48,
							value: settings.alertSignup_Wednesday_48,
						},
						{
							name: settings.alertSignup_Sunday,
							value: settings.alertSignup_Sunday,
						},
						{
							name: settings.alertSignup_Sunday_48,
							value: settings.alertSignup_Sunday_48,
						},
					),
			),
	);
module.exports = {
	data: command,
	async execute(interaction) {
		if (!interaction.isCommand()) return;

		if (interaction.options.getSubcommand() === 'get_setting') {
			const setting = interaction.options.getString('setting_name');
			const currentSetting = await getSettings(setting);

			await interaction.reply({
				content: `${setting} is currently set as ${currentSetting}`,
				ephemeral: true,
			});
		}
		else if (interaction.options.getSubcommand() === 'toggle_setting') {
			const setting = interaction.options.getString('setting_name');
			const currentSetting = await getSettings(setting);

			const newSetting = !currentSetting;
			await setSetting(setting, newSetting);

			await interaction.reply({
				content: `Set ${setting} as ${newSetting}`,
				ephemeral: true,
			});
		}
	},
};
