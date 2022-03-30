const { databaseString, applicationsCategoryId } = require('../../config.json');
const Keyv = require('keyv');
const { copyApplicationToViewer } = require('./copyApplicationToViewer');
const { archiveApplicationThreads } = require('./archiveApplicationThreads');
const { keepApplicationThreadAlive } = require('./keepApplicationThreadAlive');

const openApplications = new Keyv(databaseString);
openApplications.on('error', err => console.error('Keyv connection error:', err));

async function checkApplications(client) {
	console.log(`${new Date().toLocaleString()}: Setting up Check Applications...`);

	const checkminutes = 0.5, checkthe_interval = checkminutes * 60 * 1000;
	setInterval(async () => {
		console.log(`${new Date().toLocaleString()}: Checking Applications...`);

		client.guilds.cache
			.forEach(async guild => {
				console.log(`${new Date().toLocaleString()}: Retrieving guilds to check applications...`);

				guild.channels
					.fetch()
					.then(async channels => {
						console.log(`${new Date().toLocaleString()}: Found ${channels.size} guild channels to check applications...`);

						channels.forEach(async channel => {
							if (channel.id === applicationsCategoryId) {
								const trackedCategoryChannel = channel;
								console.log(`${new Date().toLocaleString()}: Channels in tracked category: ${trackedCategoryChannel.children.size}`);

								if (trackedCategoryChannel.children.size) {
									// eslint-disable-next-line max-nested-callbacks
									trackedCategoryChannel.children.forEach(async trackedChannel => {
										const trackedChannelThreadId = await openApplications.get(trackedChannel.id);
										if (typeof trackedChannelThreadId === 'undefined') {
											await copyApplicationToViewer(trackedChannel);
										}
										else {
											await keepApplicationThreadAlive(trackedChannel, trackedChannelThreadId);
										}
									});
								}
								else {
									await archiveApplicationThreads(trackedCategoryChannel);
									await openApplications.clear();
								}

							}
						});

						console.log(`${new Date().toLocaleString()}: Completed check applications`);
					})
					.catch(console.error);
			});
	}, checkthe_interval);
}

exports.checkApplications = checkApplications;