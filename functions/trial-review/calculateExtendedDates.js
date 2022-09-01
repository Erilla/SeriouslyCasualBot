const { calculateReviewDates } = require('./calculateReviewDates');

function calculateExtendedDates(startDate, extended) {

	const { finalReviewDate } = calculateReviewDates(startDate);

	const extendedReviewDates = [];

	if (extended) {
		for (let index = 0; index < extended; index++) {
			const extendedDate = calculateExtendedDate(finalReviewDate, index + 1);
			extendedReviewDates.push(extendedDate);
		}
	}

	return extendedReviewDates;
}

const calculateExtendedDate = (finalReviewDate, numOfWeeks) => {
	const date = new Date(finalReviewDate);
	date.setDate(date.getDate() + numOfWeeks * 7);
	return date;
};

exports.calculateExtendedDates = calculateExtendedDates;