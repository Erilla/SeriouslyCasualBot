const { guildInfoChannelId } = require('../../config.json');
const { MessageEmbed } = require('discord.js');
const achievementsContent = require('../../data/achievements.json');

function updateAchievements(interaction) {
	console.log('Updating Achievements...');

	const content = {
		raids: '',
		progress: '',
		result: '',
	};
	buildAchievements(content);

	const embed = new MessageEmbed()
		.setTitle(achievementsContent.title)
		.addFields({
			name: 'Raid',
			value: `${content.raids}`,
			inline: true,
		},
		{
			name: '\u200b',
			value: `${content.progress}`,
			inline: true,
		},
		{
			name: '\u200b',
			value: `${content.result}`,
			inline: true,
		})
		.setColor('GREEN');

	const channel = interaction.client.channels.cache.get(guildInfoChannelId);
	channel.send({ embeds: [embed] });

	console.log('Finished updating Achievements.');
}

function buildAchievements(content) {
	let expansion = 99;
	achievementsContent.achievements.forEach(achievement => {
		if (expansion > achievement.expansion) {
			content.raids += '\n';
			content.progress += '\n';
			content.result += '\n';
			expansion = achievement.expansion;
		}

		content.raids += achievement.raid + '\n';
		content.progress += achievement.progress + '\n';
		content.result += achievement.result + '\n';
	});
}

exports.updateAchievements = updateAchievements;