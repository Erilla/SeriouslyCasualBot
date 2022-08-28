const { checkApplications } = require('../functions/applications/checkApplications');
const { updateAchievements } = require('../functions/guild-info/updateAchievements');

module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		checkApplications(client);

		const checkminutes = 30, checkthe_interval = checkminutes * 60 * 1000;

		console.log(`${new Date().toLocaleString()}: Setting up Update Achievements (every ${checkminutes} minutes)...`);
		setInterval(async () => {
			try {
				updateAchievements({ client });
			}
			catch {
				console.log(`${new Date().toLocaleString()}: Failed to update achievements.`);
			}
		}, checkthe_interval);
	},
};