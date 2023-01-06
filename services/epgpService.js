const axios = require('axios');

const getPriorityRankings = (tierToken, armourType) => {
	let url = 'https://epgp-api.ryanwong.uk/api/Points/raider/all';

	if (tierToken) {
		url += `/tierToken/${tierToken}`;
	}
	else if (armourType) {
		url += `/armour/${armourType}`;
	}

	const promise = axios.get(url);
	const dataPromise = promise
		.then((response) => response.data)
		.catch((error) => error);

	return dataPromise;
};

exports.getPriorityRankings = getPriorityRankings;
