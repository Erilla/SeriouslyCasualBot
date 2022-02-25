const { applicationsViewerChannelId, applicationCloneDelay, databaseString } = require('../../config.json');
const wait = require('util').promisify(setTimeout);
const Keyv = require('keyv');

const openApplications = new Keyv(databaseString);
openApplications.on('error', err => console.error('Keyv connection error:', err));

async function copyApplicationToViewer(newChannel) {
	console.log('Copying new application to viewer...');

	if (await openApplications.get(newChannel.id)) {
		console.log(`${newChannel.name} already linked.`);
		return;
	}

	await wait(applicationCloneDelay);

	console.log(`Wait ${applicationCloneDelay} complete, continuing...`);

	await retrieveApplication(newChannel)
		.then(async application => {
			console.log('Application retrieved.');

			const applicationMessages = [];
			sliceApplicationMessages(applicationMessages, application);

			console.log('Done splitting application...');

			newChannel.client.channels
				.fetch(applicationsViewerChannelId)
				.then(async viewerChannel => {
					console.log(`Found viewer channel ${viewerChannel.id}...`);

					await postApplicationMessages(newChannel, viewerChannel, applicationMessages);

					console.log('Messaged posted.');
				})
				.catch(console.error);
		});
}

async function retrieveApplication(newChannel) {
	console.log('Getting application from new channel...');

	let application = '';
	return await newChannel.messages.fetch()
		.then(messages => {
			console.log(`${messages.length} messages found...`);

			messages.reverse().forEach(message => {
				if (message.embeds.length) {
					application += message.embeds[0].description + '\n';
				}
			});

			return application;
		})
		.catch(console.error);
}

function sliceApplicationMessages(applicationMessages, application) {
	console.log('Splitting application...');

	const maxLength = 2000;
	if (application.length > maxLength) {
		applicationMessages.push(application.slice(0, maxLength));
		sliceApplicationMessages(applicationMessages, application.slice(maxLength));
	}
	else {
		applicationMessages.push(application);
	}

	return applicationMessages;
}

async function postApplicationMessages(newChannel, viewerChannel, applicationMessages) {
	console.log('Posting application to viewer channel...');

	viewerChannel
		.send(applicationMessages[0])
		.then(async message => {
			console.log(`Created message for ${viewerChannel.name}: ${message.id}`);

			console.log('Creating thread for message...');

			await message.suppressEmbeds(true);
			await message
				.startThread({
					name: `${newChannel.name} discussion`,
				})
				.then(thread => {
					console.log(`Thread created: ${thread.id}`);

					if (applicationMessages.length > 1) {
						console.log('Posting additional application messages into thread...');

						applicationMessages.slice(1).forEach(applicationMessage => {
							thread
								.send(applicationMessage)
								.then(async threadMessage => {
									await threadMessage.suppressEmbeds(true);
								});
						});

						console.log('Thread messages done.');
					}

					console.log('Setting link between new channel id and thread id.');

					openApplications.set(newChannel.id, thread.id);
				})
				.catch(console.error);
		})
		.catch(console.error);
}

exports.copyApplicationToViewer = copyApplicationToViewer;