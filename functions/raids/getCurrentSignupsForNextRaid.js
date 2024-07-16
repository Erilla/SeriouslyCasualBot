const { getUpcomingRaids, getRaidDetails } = require('../../services/wowauditService');

const getCurrentSignupsForNextRaid = async () => {
	let upcomingRaids = await getUpcomingRaids();
	if (upcomingRaids) {
		upcomingRaids.sort((a, b) => new Date(a.date) > new Date(b.date));
		upcomingRaids = upcomingRaids.filter(
			(raid) => raid.difficulty === 'Mythic' && raid.status === 'Planned',
		);
		const nextRaid = upcomingRaids[0];

		const nextRaidDetailed = await getRaidDetails(nextRaid.id);

		if (nextRaidDetailed) {
			const result = {
				id: nextRaid.id,
				date: nextRaid.date,
				signups: nextRaidDetailed.signups.map((x) => {
					return { name: x.character.name, status: x.status };
				}),
			};
			return result;
		}
		else {
			console.log('Could not get details for raid');
		}
	}
	else {
		console.log('Could not get upcoming raids');
	}

	return null;
};

exports.getCurrentSignupsForNextRaid = getCurrentSignupsForNextRaid;
