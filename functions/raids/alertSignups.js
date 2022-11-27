const { databaseString, raidersLoungeChannelId } = require('../../config.json');
const { settings } = require('../settings/settings');
const { getSettings } = require('../settings/getSettings');
const signupAlertMessages = require('../../data/signupAlertMessages.json');

const Keyv = require('keyv');
const {
	getCurrentSignupsForNextRaid,
} = require('./getCurrentSignupsForNextRaid');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', (err) => console.error('Keyv connection error:', err));

const alertSignups = async (client) => {
	const getTodayDoW = new Date().getDay();
	switch (getTodayDoW) {
		case 1: {
			// Monday, checks for Wednesday raid
			const wednesdaySetting = await getSettings(
				settings.alertSignup_Wednesday_48,
			);
			if (!wednesdaySetting) {
				console.log('Wednesday Raid Alert disabled - Skipping...');
				return;
			}
			break;
		}
		case 2: {
			// Tuesday, checks for Wednesday raid
			const wednesdaySetting = await getSettings(
				settings.alertSignup_Wednesday,
			);
			if (!wednesdaySetting) {
				console.log('Wednesday Raid Alert disabled - Skipping...');
				return;
			}
			break;
		}
		case 5: {
			// Friday, checks for Sunday raid
			const sundaySetting = await getSettings(settings.alertSignup_Sunday_48);
			if (!sundaySetting) {
				console.log('Sunday Raid Alert disabled - Skipping...');
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
			break;
	}

	const signups = await getCurrentSignupsForNextRaid();
	let message = '';
	if (signups) {
		const notSignedRaiders = signups.signups.filter(
			(signup) => signup.status === 'Unknown',
		);

		const notSignedUsers = await Promise.all(
			await notSignedRaiders.map(
				async (notSignedRaider) =>
					await raiders
						.get(notSignedRaider.name)
						.catch((err) => console.error(err)),
			),
		).catch((err) => console.error(err));

		if (notSignedUsers.length) {
			notSignedUsers.forEach((user) => {
				if (user) {
					message += `<@${user}>\n`;
				}
			});

			const messageIndex = Math.floor(
				Math.random() * signupAlertMessages.messages.length,
			);

			message += `\n ${signupAlertMessages.messages[messageIndex]}`;

			message += `\n <#980016906620776528> / https://wowaudit.com/eu/silvermoon/seriouslycasual/main/raids/${signups.id}`;
		}
		else {
			message += 'Holy shit everyone has signed up for the next raid!';
		}

		const raidersLoungeChannel = await client.channels
			.fetch(raidersLoungeChannelId)
			.catch((err) => console.error(err));
		await raidersLoungeChannel.send(message).catch((err) => console.error(err));
		return true;
	}
	else {
		throw 'Unable to retrieve signups';
	}
};

exports.alertSignups = alertSignups;
