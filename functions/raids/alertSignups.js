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
	const today = new Date();
	const getTodayDoW = today.getDay();
	const nextRaidDay = new Date();

	let twoDayReminder = false;

	switch (getTodayDoW) {
		case 1: {
			// Monday, checks for Wednesday raid
			twoDayReminder = true;
			nextRaidDay.setDate(today.getDate() + 2);
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
			nextRaidDay.setDate(today.getDate() + 1);
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
			twoDayReminder = true;
			nextRaidDay.setDate(today.getDate() + 2);
			const sundaySetting = await getSettings(settings.alertSignup_Sunday_48);
			if (!sundaySetting) {
				console.log('Sunday Raid Alert disabled - Skipping...');
				return;
			}
			break;
		}
		case 6: {
			// Saturday, checks for Sunday raid
			nextRaidDay.setDate(today.getDate() + 1);
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

	nextRaidDay.setHours(19, 0, 0);

	const nextRaid = await getCurrentSignupsForNextRaid();
	let message = '';
	const nextRaidDayString = nextRaidDay.toISOString().split('T')[0];
	if (
		nextRaid &&
		nextRaidDay !== today &&
		nextRaidDayString === nextRaid.date
	) {
		const notSignedRaiders = nextRaid.signups.filter(
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

		let foundUser = false;

		if (notSignedUsers.length) {
			if (twoDayReminder) {
				const deadlineDate = new Date().setDate(nextRaidDay.getDate() - 1);
				const timer = Math.floor(deadlineDate / 1000);
				message += `You have [<t:${timer}:R>] to sign else you won't get your EP!\n\n`;
			}

			notSignedUsers.forEach((user) => {
				if (user && user !== 'undefined') {
					console.log('user entered');
					foundUser = true;
					message += `<@${user}>\n`;
				}
			});

			const messageIndex = Math.floor(
				Math.random() * signupAlertMessages.messages.length,
			);

			message += `\n ${signupAlertMessages.messages[messageIndex]}`;

			message += `\n\n <#980016906620776528> / https://wowaudit.com/eu/silvermoon/seriouslycasual/main/raids/${nextRaid.id}`;
		}

		if (!foundUser) {
			if (twoDayReminder) {
				message = '';
			}
			else {
				message = 'Holy shit everyone has signed up for the next raid!';
			}
		}

		if (message !== '') {
			const raidersLoungeChannel = await client.channels
				.fetch(raidersLoungeChannelId)
				.catch((err) => console.error(err));
			await raidersLoungeChannel
				.send(message)
				.catch((err) => console.error(err));
		}

		return true;
	}
	else {
		throw 'Unable to retrieve signups';
	}
};

exports.alertSignups = alertSignups;
