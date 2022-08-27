const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function removeTrial(threadId) {

	await trials.delete(threadId);
}

exports.removeTrial = removeTrial;