const { wowAuditApiSecret } = require('../../config.json');
const fetch = require('node-fetch');

const getCurrentSignupsForNextRaid = async () => {
	let upcomingRaids = await getUpcomingRaids();
	if (upcomingRaids) {
		upcomingRaids.sort((a, b) => new Date(a.date) > new Date(b.date));
		upcomingRaids = upcomingRaids.filter(raid => raid.difficulty !== 'Mythic');
		const nextRaid = upcomingRaids[0];
		const nextRaidDetailed = await getRaidDetails(nextRaid.id);
		if (nextRaidDetailed) {
			return nextRaidDetailed.signups.map(x => { return { name : x.character.name, status: x.status }; });
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

const getUpcomingRaids = async () => {
	return await fetch('https://wowaudit.com/v1/raids?include_past=false', generateQueryOptions())
		.then(response => response.json())
		.then(response => response.raids)
		.catch(err => console.error(err));
};

const getRaidDetails = async (id) => {
	return await fetch(`https://wowaudit.com/v1/raids/${id}}`, generateQueryOptions())
		.then(response => response.json())
		.then(response => response)
		.catch(err => console.error(err));
};

const generateQueryOptions = () => {
	return {
		method: 'GET',
		headers: {
			accept: 'application/json',
			Authorization: `${wowAuditApiSecret}`,
		},
	};
};

exports.getCurrentSignupsForNextRaid = getCurrentSignupsForNextRaid;