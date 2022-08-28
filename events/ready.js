const { checkApplications } = require('../functions/applications/checkApplications');
const { updateAchievements } = require('../functions/guild-info/updateAchievements');
const { updateTrialLogs } = require('../functions/trial-review/updateTrialLogs');

module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		checkApplications(client);

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
				updateTrialLogs(client);
			}
			catch {
				console.log(`${new Date().toLocaleString()}: Failed to update Trial Logs Messages.`);
			}
		}, updateTrialLogsMessageMInterval);
	},
};