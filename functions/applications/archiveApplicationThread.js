const { applicationsViewerChannelId, databaseString } = require('../../config.json');
const Keyv = require('keyv');

const openApplications = new Keyv(databaseString);
openApplications.on('error', err => console.error('Keyv connection error:', err));

async function archiveApplicationThread(deletedChannel) {
	console.log('Archiving application thread...');
	const threadId = await openApplications.get(deletedChannel.id);
	if (threadId.length) {
		deletedChannel.guild.channels
			.fetch(applicationsViewerChannelId)
			.then(applicationViewerChannel => {
				applicationViewerChannel.threads
					.fetch(threadId)
					.then(async thread => {
						if (thread) {
							await thread.send('Application closed - Archiving Thread');
							await thread.setArchived(true);
						}
					});
			});
		openApplications.delete(deletedChannel.id);
	}
	console.log('Archive application thread completed.');
}

exports.archiveApplicationThread = archiveApplicationThread;