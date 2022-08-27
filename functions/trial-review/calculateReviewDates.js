function calculateReviewDates(startDate) {
	const weeksUntilFirstReview = 2;
	const weeksUntilFinalReview = 4;

	startDate = new Date(startDate);
	const firstReviewDate = new Date(startDate);
	firstReviewDate.setDate(firstReviewDate.getDate() + weeksUntilFirstReview * 7);
	const finalReviewDate = new Date(startDate);
	finalReviewDate.setDate(finalReviewDate.getDate() + weeksUntilFinalReview * 7);

	return { startDate, firstReviewDate, finalReviewDate };
}

exports.calculateReviewDates = calculateReviewDates;