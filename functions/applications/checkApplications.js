const { databaseString, applicationsCategoryId } = require('../../config.json');
const Keyv = require('keyv');
const { copyApplicationToViewer } = require('./copyApplicationToViewer');

const openApplications = new Keyv(databaseString, { namespace: 'openApplications' });
openApplications.on('error', err => console.error('Keyv connection error:', err));

async function checkApplications(client) {
	const checkminutes = 5, checkthe_interval = checkminutes * 60 * 1000;
	console.log(`${new Date().toLocaleString()}: Setting up Check Applications (every ${checkminutes} minutes)...`);

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
							if (channel && channel.id && channel.id === applicationsCategoryId) {
								const trackedCategoryChannel = channel;
								console.log(`${new Date().toLocaleString()}: Channels in tracked category: ${trackedCategoryChannel.children.cache.size}`);

								if (trackedCategoryChannel.children.cache.size) {
									// eslint-disable-next-line max-nested-callbacks
									trackedCategoryChannel.children.cache.forEach(async trackedChannel => {
										const trackedChannelThreadId = await openApplications.get(trackedChannel.id);
										if (typeof trackedChannelThreadId === 'undefined') {
											await copyApplicationToViewer(trackedChannel);
										}
									});
								}
								else {
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