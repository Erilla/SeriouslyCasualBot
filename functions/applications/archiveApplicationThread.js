const { applicationsViewerChannelId, databaseString } = require('../../config.json');
const Keyv = require('keyv');

const openApplicationThreads = new Keyv(databaseString, { namespace: 'openApplicationThreads' });
openApplicationThreads.on('error', err => console.error('Keyv connection error:', err));

async function archiveApplicationThread(client, threadId) {
	console.log(`Archiving application thread ${threadId}...`);

	const applicationViewerChannel = await client.channels.fetch(applicationsViewerChannelId);
	const thread = await applicationViewerChannel.threads.fetch(threadId);
	if (thread) {

		const initialMessage = await thread.fetchStarterMessage();
		await initialMessage.edit({ content: initialMessage.content, components: [] });

		await thread.send('Application closed - Archiving Thread');
		thread.setArchived(true)
			.then(newThread => {
				console.log(`Application Thread ${newThread.id} archived`);
			})
			.catch(console.error);

		await openApplicationThreads.delete(threadId);
	}
	else {
		console.log(`Could not find Thread ${threadId}`);
	}
}

exports.archiveApplicationThread = archiveApplicationThread;