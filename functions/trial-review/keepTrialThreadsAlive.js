const { databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { keepTrialThreadAlive } = require('./keepTrialThreadAlive');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function keepTrialThreadsAlive(client) {

	// eslint-disable-next-line no-unused-vars
	for await (const [key, value] of trials.iterator()) {
		await keepTrialThreadAlive(client, key)
			.catch(err => console.error(err));
	}
}

exports.keepTrialThreadsAlive = keepTrialThreadsAlive;