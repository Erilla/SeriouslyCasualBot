const { databaseString, raidersLoungeChannelId } = require('../../config.json');
const { settings } = require('../settings/settings');
const { getSettings } = require('../settings/getSettings');

const Keyv = require('keyv');
const { getCurrentSignupsForNextRaid } = require('./getCurrentSignupsForNextRaid');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', err => console.error('Keyv connection error:', err));

const alertSignups = async (client) => {
	const getTodayDoW = new Date().getDay();
	switch (getTodayDoW) {
	case 2: {
		// Tuesday, checks for Wednesday raid
		const wednesdaySetting = await getSettings(settings.alertSignup_Wednesday);
		if (!wednesdaySetting) {
			console.log('Wednesday Raid Alert disabled - Skipping...');
			return;
		}
		break;
	}
	case 6: {
		// Saturday, checks for Sunday raid
		const sundaySetting = await getSettings(settings.alertSignup_Sunday);
		if (!sundaySetting) {
			console.log('Sunday Raid Alert disabled - Skipping...');
			return;
		}
		break;
	}
	default:
		return;
	}

	const signups = await getCurrentSignupsForNextRaid();
	if (signups) {
		const notSignedRaiders = signups.signups.filter(signup => signup.status === 'Unknown');

		const notSignedUsers = await Promise.all(
			await notSignedRaiders.map(async notSignedRaider =>
				await raiders
					.get(notSignedRaider.name)
					.catch(err => console.error(err)),
			))
			.catch(err => console.error(err));

		let message = '> ';

		if (notSignedUsers.length) {
			notSignedUsers.forEach(user => {
				if (user) {
					message += `<@${user}>`;
				}
			});

			message += `\n> \n> Sign up for the next raid! \n> <#980016906620776528> / https://wowaudit.com/eu/silvermoon/seriouslycasual/main/raids/${signups.id}`;

			const raidersLoungeChannel = await client.channels
				.fetch(raidersLoungeChannelId)
				.catch(err => console.error(err));
			await raidersLoungeChannel
				.send(message)
				.catch(err => console.error(err));

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