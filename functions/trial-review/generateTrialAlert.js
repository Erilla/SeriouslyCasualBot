const { calculateExtendedDates } = require('./calculateExtendedDates');
const { calculateReviewDates } = require('./calculateReviewDates');

function generateTrialAlert(trial) {
	const trialAlert = [];

	const { firstReviewDate, finalReviewDate } = calculateReviewDates(trial.startDate);

	const firstReview = createTrialAlertObject('First Review', firstReviewDate);
	trialAlert.push(firstReview);

	const finalReview = createTrialAlertObject('Final Review', finalReviewDate);
	trialAlert.push(finalReview);

	if (trial.extended) {
		const extendedDates = calculateExtendedDates(trial.startDate, trial.extended);

		for (let index = 0; index < extendedDates.length; index++) {
			const extendedDate = extendedDates[index];

			const extendedReview = createTrialAlertObject(`Extended Review (${index})`, extendedDate, index);
			trialAlert.push(extendedReview);
		}
	}

	return trialAlert;
}

function createTrialAlertObject(name, date) {
	return {
		name,
		date,
		alerted: new Date(date) < new Date(),
	};
}

exports.generateTrialAlert = generateTrialAlert;