const { archiveApplicationThread } = require('../functions/applications/archiveApplicationThread');
const { applicationsCategoryId } = require('../config.json');

module.exports = {
	name: 'channelDelete',
	once: true,
	async execute(deletedChannel) {
		console.log(`${deletedChannel.name} has been deleted`);
		if (deletedChannel.type === 'GUILD_TEXT' && deletedChannel.parentId == applicationsCategoryId) {
			console.log('Channel was created in the tracked category');
			await archiveApplicationThread(deletedChannel);
		}
	},
};