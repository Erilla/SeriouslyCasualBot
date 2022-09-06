const { databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { generateTrialAlert } = require('./generateTrialAlert');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

const trialAlerts = new Keyv(databaseString, { namespace: 'trialAlerts' });
trialAlerts.on('error', err => console.error('Keyv connection error:', err));

async function updateTrialAlerts(threadId) {

	const trial = await trials
		.get(threadId)
		.catch(err => console.error(err));
	let trialAlert = await trialAlerts
		.get(threadId)
		.catch(err => console.error(err));
	trialAlert = await generateTrialAlert(trial)
		.catch(err => console.error(err));
	await trialAlerts
		.set(threadId, trialAlert)
		.catch(err => console.error(err));
}

exports.updateTrialAlerts = updateTrialAlerts;