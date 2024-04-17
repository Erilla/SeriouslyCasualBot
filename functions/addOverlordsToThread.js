const { databaseString } = require('../config.json');
const Keyv = require('keyv');

const overlords = new Keyv(databaseString, {
	namespace: 'overlords',
});

async function addOverlordsToThread(thread) {

	for await (const [, value] of overlords.iterator()) {

		await thread.members
			.add(value)
			.catch(console.error);
	}
}

exports.addOverlordsToThread = addOverlordsToThread;