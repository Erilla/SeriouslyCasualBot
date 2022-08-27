const { calculateReviewDates } = require('./calculateReviewDates');

function generateTrialReviewContent(characterName, role, inputStartDate) {

	const { startDate, firstReviewDate, finalReviewDate } = calculateReviewDates(inputStartDate);

	let content = '';
	content += `**${characterName}** - ${role}\n`;
	content += `Start Date: ${startDate.toDateString()} <t:${Math.floor(startDate.valueOf() / 1000)}:R>\n`;
	content += `First Review: ${firstReviewDate.toDateString()} <t:${Math.floor(firstReviewDate.valueOf() / 1000)}:R>\n`;
	content += `Final Review: ${finalReviewDate.toDateString()} <t:${Math.floor(finalReviewDate.valueOf() / 1000)}:R>\n`;

	return content;
}

exports.generateTrialReviewContent = generateTrialReviewContent;