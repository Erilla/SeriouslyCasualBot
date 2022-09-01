const { databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { generateTrialAlert } = require('./generateTrialAlert');
const { generateTrialReviewContent } = require('./generateTrialReviewContent');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

const trialAlerts = new Keyv(databaseString, { namespace: 'trialAlerts' });
trialAlerts.on('error', err => console.error('Keyv connection error:', err));

async function extendTrial(threadId) {

	let trial = await trials.get(threadId);
	let trialAlert = await trialAlerts.get(threadId);

	if (!trial.extended) {
		trial = {
			...trial,
			extended: 0,
		};
	}
	trial.extended++;

	trialAlert = generateTrialAlert(trial);

	await trials.set(threadId, trial);
	await trialAlerts.set(threadId, trialAlert);

	return generateTrialReviewContent(trial.characterName, trial.role, trial.startDate, trial.extended);
}

exports.extendTrial = extendTrial;