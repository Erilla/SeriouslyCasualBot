const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

const trialAlerts = new Keyv(databaseString, { namespace: 'trialAlerts' });
trialAlerts.on('error', err => console.error('Keyv connection error:', err));

async function removeTrial(threadId) {

	await trials
		.delete(threadId)
		.catch(err => console.error(err));
	await trialAlerts
		.delete(threadId)
		.catch(err => console.error(err));
}

exports.removeTrial = removeTrial;