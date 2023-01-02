const axios = require('axios');

const getPriorityRankings = () => {
	const url = 'https://epgp-api.ryanwong.uk/api/Points/raider/all';

	const promise = axios.get(url);
	const dataPromise = promise
		.then((response) => response.data)
		.catch((error) => error);

	return dataPromise;
};

exports.getPriorityRankings = getPriorityRankings;
