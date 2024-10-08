const fetch = require('node-fetch');
const { wowAuditApiSecret } = require('../config.json');

const getUpcomingRaids = async () => {
	return await fetch(
		'https://wowaudit.com/v1/raids?include_past=false',
		generateQueryOptions(),
	)
		.then((response) => response.json())
		.then((response) => response.raids)
		.catch((err) => console.error(err));
};

const getRaidDetails = async (id) => {
	return await fetch(
		`https://wowaudit.com/v1/raids/${id}}`,
		generateQueryOptions(),
	)
		.then((response) => response.json())
		.then((response) => response)
		.catch((err) => console.error(err));
};

const getHistoricalData = async () => {
	const previousPeriod = +(await getCurrentPeriod()) - 1;
	return await fetch(
		`https://wowaudit.com/v1/historical_data?period=${previousPeriod}`,
		generateQueryOptions(),
	)
		.then((response) => response.json())
		.then((response) => response.characters)
		.catch((err) => console.error(err));
};

const getCurrentPeriod = async () => {
	return await fetch(
		'https://wowaudit.com/v1/period',
		generateQueryOptions(),
	)
		.then((response) => response.json())
		.then((response) => response.current_period)
		.catch((err) => console.error(err));
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

exports.getUpcomingRaids = getUpcomingRaids;
exports.getRaidDetails = getRaidDetails;
exports.getHistoricalData = getHistoricalData;
