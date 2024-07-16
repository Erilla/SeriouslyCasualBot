const { getTrialLogs } = require('./getTrialLogs');

async function generateTrialLogsContent(trial) {

	const baseUrl = 'https://www.warcraftlogs.com/reports/';
	let content = 'Logs:\n';

	const logCodes = await getTrialLogs(trial.characterName);

	for (const code of logCodes) {
		content += `${baseUrl}${code}\n`;
	}

	return content;
}

exports.generateTrialLogsContent = generateTrialLogsContent;