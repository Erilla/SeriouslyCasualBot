const fetch = require('node-fetch');
const { bnetClientId, bnetClientSecret } = require('../config.json');


const guildId = 'seriouslycasual';
const guildServer = 'silvermoon';

const getAccessToken = async () => {
	const encodedAuthorization = Buffer.from(`${bnetClientId}:${bnetClientSecret}`).toString('base64');

	const data = new URLSearchParams();
	data.append('grant_type', 'client_credentials');

	const dataPromise = await fetch('https://oauth.battle.net/token',
		{
			method: 'POST',
			headers: {
				'Authorization': `Basic ${encodedAuthorization}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: data,
		})
		.then(response => response.json());

	return dataPromise['access_token'];
};

const getGuildRoster = async () => {
	const accessToken = await getAccessToken();
	const url = `https://eu.api.blizzard.com/data/wow/guild/${guildServer}/${guildId}/roster?namespace=profile-eu&locale=en_US&access_token=${accessToken}`;

	const dataPromise = await fetch(url,
		{
			method: 'GET',
		})
		.then(response => response.json());
	const filteredMembers = dataPromise.members.filter(m => [0, 1, 3, 4, 5, 7].includes(m.rank) && m.character.level >= 10);
	return filteredMembers;
};

exports.getGuildRoster = getGuildRoster;
