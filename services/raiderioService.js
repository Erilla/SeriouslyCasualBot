const axios = require('axios');

const guildId = '1061585%2C43113';

const getRaidRankings = async (raid) => {
	const baseUrl = 'https://raider.io/api/v1/raiding/raid-rankings';
	const url = `${baseUrl}?raid=${raid}&difficulty=mythic&region=world&guilds=${guildId}&limit=50`;

	const promise = axios.get(url);
	const dataPromise = promise
		.then(response => response.data)
		.catch(error => error);

	return dataPromise;
};

const getRaidStaticData = async (expansionId) => {
	const baseUrl = 'https://raider.io/api/v1/raiding/static-data';
	const url = `${baseUrl}?expansion_id=${expansionId}`;

	const promise = axios.get(url);
	const dataPromise = promise
		.then(response => response.data)
		.catch(error => error);

	return dataPromise;
};

exports.getRaidRankings = getRaidRankings;
exports.getRaidStaticData = getRaidStaticData;

// Raid				Progress	Ranking	(WR)	CE
// Sepulcher of the First Ones	2/10M		1463		Y

// Raid
// static-data - raids[].name

// Progress
// static-data raids[].encounters for total bosses
// raid-rankings raidRankings[].encountersDefeated for bosses killed
// Always just append "M" for mythic

// Ranking (WR)
// Check if tier has ended in static-data raids[].ends.eu !== null
// If it has ended get WR from
// raid-rankings raidRankings[].rank

// CE
// Get last boss slug from static data
// get end date of tier from static data
// compare firstDefeated date for last boss