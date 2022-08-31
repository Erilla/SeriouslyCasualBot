const { databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { generateTrialAlert } = require('./generateTrialAlert');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

const trialAlerts = new Keyv(databaseString, { namespace: 'trialAlerts' });
trialAlerts.on('error', err => console.error('Keyv connection error:', err));

async function updateTrialAlerts(threadId) {

	const trial = await trials.get(threadId);
	let trialAlert = await trialAlerts.get(threadId);
	trialAlert = await generateTrialAlert(trial);
	await trialAlerts.set(threadId, trialAlert);
}

exports.updateTrialAlerts = updateTrialAlerts;