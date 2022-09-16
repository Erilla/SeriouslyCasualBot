const { applicationsViewerChannelId, databaseString } = require('../../config.json');
const { ThreadAutoArchiveDuration } = require('discord.js');

const Keyv = require('keyv');

const openApplicationThreads = new Keyv(databaseString, { namespace: 'openApplicationThreads' });
openApplicationThreads.on('error', err => console.error('Keyv connection error:', err));

const adminRoleId = '255630010088423425';

async function keepApplicationThreadAlive(client, threadId) {

	const applicationViewerChannel = await client.channels
		.fetch(applicationsViewerChannelId)
		.catch(err => console.error(err));
	const thread =
		await applicationViewerChannel.threads
			.fetch(threadId)
			.catch(console.error);

	if (thread) {
		thread.setAutoArchiveDuration(ThreadAutoArchiveDuration.OneDay);

		if (thread.archived) {
			thread.setArchived(false)
				.then(newThread => {
					console.log(`Keeping Thread Id ${newThread.id} alive`);
				})
				.catch(console.error);
			await thread
				.send(`<@&${adminRoleId}> Application still open - Keeping thread alive`)
				.catch(err => console.error(err));
		}
	}
	else {
		await openApplicationThreads
			.delete(threadId)
			.catch(err => console.error(err));
		console.log(`Could not find Thread ${threadId}`);
	}
}

exports.keepApplicationThreadAlive = keepApplicationThreadAlive;