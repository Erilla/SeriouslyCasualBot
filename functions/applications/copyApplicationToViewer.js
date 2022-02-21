const { applicationsViewerChannelId, applicationCloneDelay, databaseString } = require('../../config.json');
const wait = require('util').promisify(setTimeout);
const Keyv = require('keyv');

const openApplications = new Keyv(databaseString);
openApplications.on('error', err => console.error('Keyv connection error:', err));

async function copyApplicationToViewer(newChannel) {
	console.log('Copying new application to viewer...');

	await wait(applicationCloneDelay);

	await retrieveApplication(newChannel)
		.then(async application => {
			const applicationMessages = [];
			sliceApplicationMessages(applicationMessages, application);

			newChannel.client.channels
				.fetch(applicationsViewerChannelId)
				.then(async viewerChannel => {
					await postApplicationMessages(newChannel, viewerChannel, applicationMessages);
				})
				.catch(console.error);
		});
}

async function retrieveApplication(newChannel) {
	let application = '';
	return await newChannel.messages.fetch()
		.then(messages => {
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

	viewerChannel
		.send(applicationMessages[0])
		.then(async message => {
			console.log(`Created message for ${viewerChannel.name}: ${message.id}`);
			await message
				.startThread({
					name: `${newChannel.name} discussion`,
				})
				.then(thread => {
					if (applicationMessages.length > 1) {
						applicationMessages.slice(1).forEach(applicationMessage => {
							thread.send(applicationMessage);
						});
					}
					openApplications.set(newChannel.id, thread.id);
				})
				.catch(console.error);
		})
		.catch(console.error);
}

exports.copyApplicationToViewer = copyApplicationToViewer;