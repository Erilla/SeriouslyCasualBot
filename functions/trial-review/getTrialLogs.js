const { databaseString, warcraftLogsClientId, warcraftLogsClientSecret } = require('../../config.json');
const fetch = require('node-fetch');
const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function getTrialLogs(characterName) {

	const token = await getToken();

	return await fetch('https://www.warcraftlogs.com/api/v2/client', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`,
		},
		body: JSON.stringify({
			query: `
                query getGuildAttendance($guildId: Int){
                    guildData {
                        guild (id: $guildId) {
                            id,
                            name,
                            attendance {
                                data {
                                    code,
                                    players  {
                                        name,
                                        presence,
                                        type
                                    }
                                }
                            }
                        }
                    }
                }
            `,
			variables: {
				'guildId': 486913,
			},
		}),
	})
		.then((res) => res.json())
		.then((result) => {
			const reportCodes = result.data.guildData.guild.attendance.data.map(s => {
				s.players = s.players.filter(p => p.name === characterName && p.presence === 1);
				return s.players.length ? s.code : null;
			}).filter(code => code !== null);
			return reportCodes.reverse();
		});
}

async function getToken() {
	const body = new URLSearchParams({
		client_id: warcraftLogsClientId,
		client_secret: warcraftLogsClientSecret,
		grant_type: 'client_credentials',
	}).toString();

	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body,
	};

	return await fetch('https://www.warcraftlogs.com/oauth/token', options)
		.then(response => response.json())
		.then(response => {
			return response.access_token;
		})
		.catch(err => console.error(err));
}

exports.getTrialLogs = getTrialLogs;