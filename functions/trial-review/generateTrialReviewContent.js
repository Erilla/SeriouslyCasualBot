const { calculateExtendedDates } = require('./calculateExtendedDates');
const { calculateReviewDates } = require('./calculateReviewDates');

function generateTrialReviewContent(characterName, role, inputStartDate, extended) {

	const { startDate, firstReviewDate, finalReviewDate } = calculateReviewDates(inputStartDate);
	let content = '';
	content += `**${characterName}** - ${role}\n`;
	content += `Start Date: ${startDate.toDateString()} <t:${Math.floor(startDate.valueOf() / 1000)}:R>\n`;
	content += `First Review: ${firstReviewDate.toDateString()} <t:${Math.floor(firstReviewDate.valueOf() / 1000)}:R>\n`;
	content += `Final Review: ${finalReviewDate.toDateString()} <t:${Math.floor(finalReviewDate.valueOf() / 1000)}:R>\n`;

	if (extended) {
		const extendedDates = calculateExtendedDates(startDate, extended);
		for (let index = 0; index < extendedDates.length; index++) {
			const extendedDate = extendedDates[index];
			content += `Extended Review (${index + 1}): ${extendedDate.toDateString()} <t:${Math.floor(extendedDate.valueOf() / 1000)}:R>\n`;
		}
	}

	return content;
}

exports.generateTrialReviewContent = generateTrialReviewContent;