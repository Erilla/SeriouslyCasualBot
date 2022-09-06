const { guildInfoChannelId } = require('../../config.json');

async function clearGuildInfo(interaction) {
	console.log('Clearing Guild Info messages...');

	const channel = await interaction.client.channels.cache.get(guildInfoChannelId);
	channel.messages.fetch()
		.then(messages => {
			console.log(`Clearing ${messages.size} messages...`);
			messages.forEach(async message => {
				await message
					.delete()
					.catch(err => console.error(err));
			});
			console.log('Finished clearing Guild Info messages');
		})
		.catch(err => console.error(err));
}

exports.clearGuildInfo = clearGuildInfo;