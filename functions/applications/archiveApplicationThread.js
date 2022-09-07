const { applicationsViewerChannelId, databaseString } = require('../../config.json');
const Keyv = require('keyv');

const openApplicationThreads = new Keyv(databaseString, { namespace: 'openApplicationThreads' });
openApplicationThreads.on('error', err => console.error('Keyv connection error:', err));

async function archiveApplicationThread(client, threadId, reason) {
	console.log(`Archiving application thread ${threadId}...`);

	const applicationViewerChannel = await client.channels
		.fetch(applicationsViewerChannelId)
		.catch(err => console.error(err));
	const thread = await applicationViewerChannel.threads
		.fetch(threadId)
		.catch(err => console.error(err));
	if (thread) {

		const initialMessage = await thread
			.fetchStarterMessage()
			.catch(err => console.error(err));
		await initialMessage
			.edit({ content: initialMessage.content, components: [] })
			.catch(err => console.error(err));

		await thread
			.send(`Application closed - Archiving Thread. Outcome: ${reason}`)
			.catch(err => console.error(err));
		thread.setArchived(true)
			.then(newThread => {
				console.log(`Application Thread ${newThread.id} archived`);
			})
			.catch(console.error);

		await openApplicationThreads
			.delete(threadId);
	}
	else {
		console.log(`Could not find Thread ${threadId}`);
	}
}

exports.archiveApplicationThread = archiveApplicationThread;