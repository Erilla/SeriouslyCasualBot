const { databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { generateTrialAlert } = require('./generateTrialAlert');
const { alertTrialReview } = require('./alertTrialReview');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

const trialAlerts = new Keyv(databaseString, { namespace: 'trialAlerts' });
trialAlerts.on('error', err => console.error('Keyv connection error:', err));

async function checkForReviewAlerts(client) {

	// eslint-disable-next-line no-unused-vars
	for await (const [key, value] of trials.iterator()) {
		let trialAlert = await trialAlerts
			.get(key)
			.catch(err => console.error(err));

		if (typeof trialAlert === 'undefined') {
			trialAlert = generateTrialAlert(value);
			await trialAlerts
				.set(key, trialAlert)
				.catch(err => console.error(err));
		}

		for (let index = 0; index < trialAlert.length; index++) {
			const alert = trialAlert[index];

			if (new Date(alert.date) < new Date() && !alert.alerted) {
				await alertTrialReview(client, key, alert.name)
					.catch(err => console.error(err));

				alert.alerted = true;
				trialAlert[index] = alert;
				await trialAlerts
					.set(key, trialAlert)
					.catch(err => console.error(err));
			}
		}
	}
}

exports.checkForReviewAlerts = checkForReviewAlerts;