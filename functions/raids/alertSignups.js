const { databaseString, raidersLoungeChannelId } = require('../../config.json');

const Keyv = require('keyv');
const { getCurrentSignupsForNextRaid } = require('./getCurrentSignupsForNextRaid');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', err => console.error('Keyv connection error:', err));

const alertSignups = async (client) => {
	const signups = await getCurrentSignupsForNextRaid();
	if (signups) {
		const notSignedRaiders = signups.filter(signup => signup.status === 'Unknown');

		const notSignedUsers = await Promise.all(
			await notSignedRaiders.map(async notSignedRaider =>
				await raiders.get(notSignedRaider.name),
			));

		let message = '> ';

		if (notSignedUsers.length) {
			notSignedUsers.forEach(user => {
				message += `<@${user}>`;
			});

			message += '\n> \n> Sign up for the next raid! <#980016906620776528>';

			const raidersLoungeChannel = await client.channels.fetch(raidersLoungeChannelId);
			await raidersLoungeChannel.send(message);

			return true;
		}
		else {
			throw 'All raiders have signed!';
		}
	}
	else {
		throw 'Unable to retrieve signups';
	}
};

exports.alertSignups = alertSignups;