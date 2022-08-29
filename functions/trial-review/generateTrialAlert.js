const { calculateReviewDates } = require('./calculateReviewDates');

function generateTrialAlert(trial) {
	const trialAlert = [];

	const { firstReviewDate, finalReviewDate } = calculateReviewDates(trial.startDate);

	const firstReview = createTrialAlertObject('First Review', firstReviewDate);
	trialAlert.push(firstReview);

	const finalReview = createTrialAlertObject('Final Review', finalReviewDate);
	trialAlert.push(finalReview);

	return trialAlert;
}

function createTrialAlertObject(name, date) {
	return {
		name,
		date,
		alerted: false,
	};
}

exports.generateTrialAlert = generateTrialAlert;