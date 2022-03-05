const { applicationsViewerChannelId, databaseString } = require('../../config.json');
const Keyv = require('keyv');

const openApplications = new Keyv(databaseString);
openApplications.on('error', err => console.error('Keyv connection error:', err));

async function archiveApplicationThread(deletedChannel) {
	console.log('Archiving application thread...');
	const threadId = await openApplications.get(deletedChannel.id);
	if (threadId && threadId.length) {
		console.log(`ThreadId ${threadId} found, continuing to archive...`);

		deletedChannel.guild.channels
			.fetch(applicationsViewerChannelId)
			.then(applicationViewerChannel => {
				console.log(`Channel ${applicationViewerChannel.id} found, continuing to archive...`);

				applicationViewerChannel.threads
					.fetch(threadId)
					.then(async thread => {
						if (thread) {
							console.log(`Thread ${thread.id} found, continuing to archive...`);

							await thread.send('Application closed - Archiving Thread');
							await thread.setArchived(true, 'Application closed - Archiving Thread');
						}
						else {
							await thread.send('Thread not found, stopping...');
						}
					})
					.catch(console.error);
			})
			.catch(console.error);

		console.log('Removing link between channel and thread...');

		openApplications.delete(deletedChannel.id);
	}
	else {
		console.log('No ThreadId found, stopping...');
	}
}

exports.archiveApplicationThread = archiveApplicationThread;