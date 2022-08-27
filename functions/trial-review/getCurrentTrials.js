const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function getCurrentTrials() {

	let content = '';

	for await (const [key, value] of trials.iterator()) {
		content += `\n\n[Thread ID]: ${key}, [Value]: ${JSON.stringify(value)}`;
	}

	if (content === '') {
		content = 'No current trials!';
	}

	return content;
}

exports.getCurrentTrials = getCurrentTrials;