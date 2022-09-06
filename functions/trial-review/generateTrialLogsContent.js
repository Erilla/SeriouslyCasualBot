const { getTrialLogs } = require('./getTrialLogs');

async function generateTrialLogsContent(trial) {

	const baseUrl = 'https://www.warcraftlogs.com/reports/';
	let content = 'Logs:\n';

	const logCodes = await getTrialLogs(trial.characterName)
		.catch(err => console.error(err));

	logCodes.forEach(code => {
		content += `${baseUrl}${code}\n`;
	});

	return content;
}

exports.generateTrialLogsContent = generateTrialLogsContent;