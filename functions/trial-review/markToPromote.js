const { trialReviewChannelId, databaseString } = require('../../config.json');

const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

const promoteAlerts = new Keyv(databaseString, { namespace: 'promoteAlerts' });
promoteAlerts.on('error', err => console.error('Keyv connection error:', err));

async function markToPromote(client, threadId) {
	const promoteAlert = await promoteAlerts.get(threadId);

	if (promoteAlert) {
		console.log(`${threadId} already marked for promotion`);
		return false;
	}
	else {
		const trialReviewChannel = await client.channels.fetch(trialReviewChannelId);
		const thread = await trialReviewChannel.threads.fetch(threadId);

		const trial = await trials.get(threadId);

		await trials.set(threadId, trial);

		const nextSunday = nextDay(0);
		const nextWednesday = nextDay(3);

		const nextRaidDay = nextSunday < nextWednesday ? nextSunday : nextWednesday;

		nextRaidDay.setHours(17);
		nextRaidDay.setMinutes(30);

		await promoteAlerts.set(threadId, nextRaidDay);

		if (thread) {
			await thread.send(`🟩 **Marked for Promotion** 🟩 \nWill alert on ${nextRaidDay.toDateString()}`);
		}
		else {
			console.log(`Could not find Thread ${threadId}`);
		}
		return true;
	}
}

const nextDay = (x) => {
	const now = new Date();
	now.setDate(now.getDate() + (x + (7 - now.getDay())) % 7);
	return now;
};

exports.markToPromote = markToPromote;