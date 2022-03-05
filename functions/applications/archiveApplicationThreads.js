const { applicationsViewerChannelId } = require('../../config.json');

async function archiveApplicationThreads(trackedCategoryChannel) {
	console.log('Archiving ALL active application thread...');

	trackedCategoryChannel.guild.channels.fetchActiveThreads()
		.then(activeThreads => {
			if (activeThreads.threads.size) {
				console.log(`${activeThreads.threads.size} active threads found...`);

				activeThreads.threads.forEach(async activeThread => {
					if (activeThread.parentId == applicationsViewerChannelId) {
						await activeThread.send('Application closed - Archiving Thread');
						await activeThread.setArchived(true, 'Application closed - Archiving Thread');
					}
				});

				console.log('Found active application threads has been archived.');
			}
			else {
				console.log('No active application found.');
			}
		})
		.catch(console.error);
}

exports.archiveApplicationThreads = archiveApplicationThreads;