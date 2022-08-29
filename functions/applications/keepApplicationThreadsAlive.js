const { databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { keepApplicationThreadAlive } = require('./keepApplicationThreadAlive');

const openApplicationThreads = new Keyv(databaseString, { namespace: 'openApplicationThreads' });
openApplicationThreads.on('error', err => console.error('Keyv connection error:', err));

async function keepApplicationThreadsAlive(client) {

	// eslint-disable-next-line no-unused-vars
	for await (const [key, value] of openApplicationThreads.iterator()) {
		await keepApplicationThreadAlive(client, key);
	}
}

exports.keepApplicationThreadsAlive = keepApplicationThreadsAlive;