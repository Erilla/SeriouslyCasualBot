const { checkApplications } = require('../functions/applications/checkApplications');
const { keepApplicationThreadsAlive } = require('../functions/applications/keepApplicationThreadsAlive');
const { updateAchievements } = require('../functions/guild-info/updateAchievements');
const { addRaiders } = require('../functions/raids/addRaiders');
const { alertPromotions } = require('../functions/trial-review/alertPromotions');
const { checkForReviewAlerts } = require('../functions/trial-review/checkForReviewAlerts');
const { keepTrialThreadsAlive } = require('../functions/trial-review/keepTrialThreadsAlive');
const { updateTrialLogs } = require('../functions/trial-review/updateTrialLogs');
const cron = require('node-cron');
const { alertSignups } = require('../functions/raids/alertSignups');

module.exports = {
	name: 'ready',
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		checkApplications(client);

		const keepApplicationThreadsAliveMinutes = 3, keepApplicationThreadsAliveInterval = keepApplicationThreadsAliveMinutes * 60 * 1000;

		console.log(`${new Date().toLocaleString()}: Keeping Application Threads Alive (every ${keepApplicationThreadsAliveMinutes} minutes)...`);
		setInterval(async () => {
			try {
				keepApplicationThreadsAlive(client);
			}
			catch {
				console.log(`${new Date().toLocaleString()}: Failed to keep application threads alive.`);
			}
		}, keepApplicationThreadsAliveInterval);

		const updateAchievementsMinutes = 30, updateAchievementsInterval = updateAchievementsMinutes * 60 * 1000;

		console.log(`${new Date().toLocaleString()}: Setting up Update Achievements (every ${updateAchievementsMinutes} minutes)...`);
		setInterval(async () => {
			try {
				updateAchievements({ client });
			}
			catch {
				console.log(`${new Date().toLocaleString()}: Failed to update achievements.`);
			}
		}, updateAchievementsInterval);

		const updateTrialLogsMessageMinutes = 60, updateTrialLogsMessageMInterval = updateTrialLogsMessageMinutes * 60 * 1000;

		console.log(`${new Date().toLocaleString()}: Setting up Update Trial Logs Messages (every ${updateTrialLogsMessageMinutes} minutes)...`);
		setInterval(async () => {
			try {
				console.log(`${new Date().toLocaleString()}: Updating Trial Logs Messages...`);
				updateTrialLogs(client);
			}
			catch {
				console.log(`${new Date().toLocaleString()}: Failed to update Trial Logs Messages.`);
			}
		}, updateTrialLogsMessageMInterval);

		const keepTrialThreadsAliveMinutes = 6, keepTrialThreadsAliveMInterval = keepTrialThreadsAliveMinutes * 60 * 1000;

		console.log(`${new Date().toLocaleString()}: Setting up Keep Trial Threads Alive (every ${keepTrialThreadsAliveMinutes} minutes)...`);
		setInterval(async () => {
			try {
				console.log(`${new Date().toLocaleString()}: Keeping Trial Threads Alive...`);
				keepTrialThreadsAlive(client);
			}
			catch {
				console.log(`${new Date().toLocaleString()}: Failed to Keep Trial Threads Alive.`);
			}
		}, keepTrialThreadsAliveMInterval);

		const checkForReviewAlertsMinutes = 3, checkForReviewAlertsMInterval = checkForReviewAlertsMinutes * 60 * 1000;

		console.log(`${new Date().toLocaleString()}: Setting up Check For Review Alerts (every ${checkForReviewAlertsMinutes} minutes)...`);
		setInterval(async () => {
			try {
				console.log(`${new Date().toLocaleString()}: Checking for Review Alerts...`);
				checkForReviewAlerts(client);
			}
			catch {
				console.log(`${new Date().toLocaleString()}: Failed to Check For Review Alerts.`);
			}
		}, checkForReviewAlertsMInterval);

		const checkForPromotionAlertsMinutes = 5, checkForPromotionAlertsMInterval = checkForPromotionAlertsMinutes * 60 * 1000;

		console.log(`${new Date().toLocaleString()}: Setting up Check For Promotion Alerts (every ${checkForPromotionAlertsMinutes} minutes)...`);
		setInterval(async () => {
			try {
				console.log(`${new Date().toLocaleString()}: Checking for Promotion Alerts...`);
				await alertPromotions(client);
				console.log(`${new Date().toLocaleString()}: Promotion Alerts done.`);
			}
			catch {
				console.log(`${new Date().toLocaleString()}: Failed to Check For Promotion Alerts.`);
			}
		}, checkForPromotionAlertsMInterval);


		await addRaiders(false, false)
			.then(() => {
				console.log('Successfully re-seeded raiders');
			})
			.catch(async (error) => {
				console.log(error);
			});

		const dayBeforeRaid = '0 19 * * 2,6';
		cron.schedule(dayBeforeRaid, async () => {
			await alertSignups(client);
		});
	},
};