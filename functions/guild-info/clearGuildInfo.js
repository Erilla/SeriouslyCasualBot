const { guildInfoChannelId } = require('../../config.json');

function clearGuildInfo(interaction) {
	console.log('Clearing Guild Info messages...');

	const channel = interaction.client.channels.cache.get(guildInfoChannelId);
	channel.messages.fetch()
		.then(messages => {
			console.log(`Clearing ${messages.size} messages...`);
			messages.forEach(message => {
				message.delete();
			});
			console.log('Finished clearing Guild Info messages');
		});
}

exports.clearGuildInfo = clearGuildInfo;