const { applicationsViewerChannelId, applicationCloneDelay, databaseString } = require('../../config.json');
const wait = require('util').promisify(setTimeout);
const Keyv = require('keyv');
const { addOverlordsToThread } = require('../addOverlordsToThread');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createVotingThreadMessage } = require('./createVotingThreadMessage');

const openApplications = new Keyv(databaseString, { namespace: 'openApplications' });
openApplications.on('error', err => console.error('Keyv connection error:', err));

const openApplicationThreads = new Keyv(databaseString, { namespace: 'openApplicationThreads' });
openApplicationThreads.on('error', err => console.error('Keyv connection error:', err));

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

					return await postApplicationMessages(newChannel, viewerChannel, applicationMessages);
				})
				.catch(console.error);
		})
		.catch(console.error);
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
	if((application.match(new RegExp("\\*\\*", "g")) || []).length)
	{
		const splitMessage = application.split(/(?=[\n])|(?<=[\n])/);

		let tempMessage = "";
		let questionFound = false;
		splitMessage.forEach(line => {
		if (line.match(new RegExp("(.*(\\*\\*.*\\*\\*){1}.*)")))
		{
			// Found a question
			if (questionFound)
			{
			applicationMessages.push(tempMessage.slice(0, maxLength));
			tempMessage = line;
			}
			else {
			questionFound = true;
			tempMessage += line;
			}
		} else {
			tempMessage += line;
		}
		});
		applicationMessages.push(tempMessage.slice(0, maxLength));
	}
	else {
		applicationMessages.push(application.slice(0, maxLength));
	}

	return applicationMessages;
}

async function postApplicationMessages(newChannel, viewerChannel, applicationMessages) {
	console.log('Posting application to viewer channel...');

	const row = new ActionRowBuilder()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('acceptedApplicant')
				.setLabel('Accepted')
				.setStyle(ButtonStyle.Success),
		)
		.addComponents(
			new ButtonBuilder()
				.setCustomId('rejectedApplicant')
				.setLabel('Rejected')
				.setStyle(ButtonStyle.Danger),
		);

	const mainMessage = applicationMessages[0] + applicationMessages[1]

	viewerChannel
		.send({ content:mainMessage, components: [row], embeds: [] })
		.then(async message => {
			console.log(`Created message for ${viewerChannel.name}: ${message.id}`);

			console.log('Creating thread for message...');

			await message
				.suppressEmbeds(true)
				.catch(err => console.error(err));
			await message
				.startThread({
					name: `${newChannel.name} discussion`,
				})
				.then(async thread => {
					console.log(`Thread created: ${thread.id}`);

					await openApplicationThreads.set(thread.id);

					if (applicationMessages.length > 2) {
						console.log('Posting additional application messages into thread...');

						applicationMessages.slice(2).forEach(async applicationMessage => {
							await thread
								.send(applicationMessage)
								.then(async threadMessage => {
									await threadMessage.suppressEmbeds(true)
										// eslint-disable-next-line max-nested-callbacks
										.catch(err => console.error(err));
								})
								.catch(console.error);
						});

						console.log('Thread messages done.');
					}

					console.log('Setting link between new channel id and thread id.');

					await openApplications.set(newChannel.id, thread.id);
					await wait(2000);
					await addOverlordsToThread(thread);
					await createVotingThreadMessage(newChannel.client, thread.id)
						.catch(err => console.error(err));
					return thread.id;
				})
				.catch(console.error);
		})
		.catch(console.error);
}

exports.copyApplicationToViewer = copyApplicationToViewer;