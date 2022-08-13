const { guildInfoChannelId } = require('../../config.json');
const { EmbedBuilder, Colors } = require('discord.js');
const scheduleContent = require('../../data/schedule.json');

function updateSchedule(interaction) {
	console.log('Updating Schedule...');

	const content = {
		day: '',
		time: '',
	};
	buildSchedule(content);

	const embed = new EmbedBuilder()
		.setTitle(scheduleContent.title)
		.addFields({
			name: 'Day',
			value: `${content.day}`,
			inline: true,
		},
		{
			name: '\u200b',
			value: '\u200b',
			inline: true,
		},
		{
			name: 'Time',
			value: `${content.time}`,
			inline: true,
		})
		.setFooter({ text: scheduleContent.timeZone })
		.setColor(Colors.Green);

	const channel = interaction.client.channels.cache.get(guildInfoChannelId);
	channel.send({ embeds: [embed] });

	console.log('Finished updating Schedule.');
}

function buildSchedule(content) {
	scheduleContent.raidDays.forEach(raidDay => {
		content.day += raidDay + '\n';
		content.time += scheduleContent.raidTimes + '\n';
	});
}

exports.updateSchedule = updateSchedule;