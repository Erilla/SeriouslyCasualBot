const axios = require('axios');

const guildId = '1061585%2C43113';

const getRaidRankings = async (raid) => {
	const baseUrl = 'https://raider.io/api/v1/raiding/raid-rankings';
	const url = `${baseUrl}?raid=${raid}&difficulty=mythic&region=world&guilds=${guildId}&limit=50`;

	const promise = axios.get(url);
	const dataPromise = promise
		.then((response) => response.data)
		.catch((error) => error);

	return dataPromise;
};

const getRaidStaticData = async (expansionId) => {
	const baseUrl = 'https://raider.io/api/v1/raiding/static-data';
	const url = `${baseUrl}?expansion_id=${expansionId}`;

	const promise = axios.get(url);
	const dataPromise = promise
		.then((response) => response.data)
		.catch((error) => error);

	return dataPromise;
};

const getPreviousWeeklyHighestMythicPlusRun = async (region, realm, name) => {
	const baseUrl = 'https://raider.io/api/v1/characters/profile';
	const url = `${baseUrl}?region=${region}&realm=${realm}&name=${encodeURIComponent(
		name,
	)}&fields=mythic_plus_previous_weekly_highest_level_runs`;

	const promise = axios.get(url);
	const dataPromise = promise
		.then((response) => response.data)
		.catch((error) => error);

	return dataPromise;
};

const getGuildRoster = async () => {
	const region = 'eu';
	const realm = 'silvermoon';
	const guildName = 'seriouslycasual';


	const baseUrl = 'https://raider.io/api/v1/guilds/profile';
	const url = `${baseUrl}?region=${region}&realm=${realm}&name=${guildName}&fields=members`;

	const promise = axios.get(url);
	const dataPromise = await promise
		.then((response) => response.data)
		.catch((error) => error);

	const filteredMembers = dataPromise.members.filter(m => [0, 1, 3, 4, 5, 7].includes(m.rank));

	return filteredMembers;
};

exports.getRaidRankings = getRaidRankings;
exports.getRaidStaticData = getRaidStaticData;
exports.getPreviousWeeklyHighestMythicPlusRun =
	getPreviousWeeklyHighestMythicPlusRun;
exports.getGuildRoster = getGuildRoster;
