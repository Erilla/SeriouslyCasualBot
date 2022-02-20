const { copyApplicationToViewer } = require('../functions/applications/copyApplicationToViewer');
const { applicationsCategoryId } = require('../config.json');

module.exports = {
	name: 'channelCreate',
	once: true,
	async execute(newChannel) {
		console.log(`${newChannel.name} has been created`);
		if (newChannel.type === 'GUILD_TEXT' && newChannel.parentId == applicationsCategoryId) {
			console.log('Channel was created in the tracked category');
			await copyApplicationToViewer(newChannel);
		}
	},
};