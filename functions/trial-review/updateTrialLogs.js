const { databaseString } = require('../../config.json');

const Keyv = require('keyv');
const { updateTrialLogsContent } = require('./updateTrialLogsContent');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function updateTrialLogs(client) {

	// eslint-disable-next-line no-unused-vars
	for await (const [key, value] of trials.iterator()) {
		updateTrialLogsContent(client, value);
	}
}

exports.updateTrialLogs = updateTrialLogs;