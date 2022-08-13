const { guildInfoChannelId, databaseString } = require('../../config.json');
const { EmbedBuilder, Colors } = require('discord.js');
const achievementsContent = require('../../data/achievements.json');
const { getRaidRankings, getRaidStaticData } = require('../../services/raiderioService');
const Keyv = require('keyv');

const guildinfoData = new Keyv(databaseString, { namespace: 'guildinfo' });

let raidsString = '';
let progressString = '';
let worldRankingstring = '';

async function updateAchievements(interaction) {
	raidsString = '';
	progressString = '';
	worldRankingstring = '';

	console.log('Updating Achievements...');

	let expansion = 4;
	let complete = false;

	while (!complete) {
		if (expansion < 6) {
			console.log(`Building manual data for Expansion ${expansion}...`);
			buildManualAchievements(expansion);
		}
		else {
			console.log(`Getting Static Data for Expansion ${expansion}...`);

			const raidStaticDataResponse = await getRaidStaticData(expansion);
			if (raidStaticDataResponse?.response?.status && raidStaticDataResponse?.response?.status === 500) {
				complete = true;
			}
			else if (raidStaticDataResponse?.raids) {
				raidStaticDataResponse?.raids?.sort((a, b) => {
					if (a.ends.eu === null) return 1;
					return (a.ends.eu > b.ends.eu) ? 1 : -1;
				});
				for (const raid of raidStaticDataResponse.raids) {
					const raidSlug = raid.slug;
					const raidName = getRaidName(raid);
					const totalBosses = getTotalNumberBosses(raid);
					const tierEndDate = getTierEndDate(raid);

					console.log(`Getting Raid Rankings for raid ${raidSlug}...`);
					const raidRankingsResponse = await getRaidRankings(raidSlug);

					console.log(`Got Raid Rankings Response for raid ${raidSlug}.`);

					let raidRanking;

					if (raidRankingsResponse.raidRankings.length > 2) {
						let encountersDefeated = 0;

						for (const tempRaidRanking of raidRankingsResponse.raidRankings) {
							if (encountersDefeated < tempRaidRanking.encountersDefeated.length) {
								encountersDefeated = tempRaidRanking.encountersDefeated.length;
								raidRanking = tempRaidRanking;
							}
						}
					}
					else {
						raidRanking = raidRankingsResponse.raidRankings[0];
					}

					const killedBosses = getKilledNumberBosses(raidRanking);
					const isCuttingEdge = checkIsCuttingEdge(raid, tierEndDate, raidRanking);
					const worldRanking = getRaidWorldRanking(tierEndDate, raidRanking, isCuttingEdge);
					const progress = buildProgress(killedBosses, totalBosses);

					if (killedBosses) {
						buildAchievement(raidName, progress, worldRanking, isCuttingEdge);
					}
				}
			}
			else {
				throw 'No raids found';
			}

		}

		expansion++;
		addNewLineToAchievements();
	}

	postAchievements(interaction);

	console.log('Finished updating Achievements.');
}

function getRaidName(raid) {
	return raid.name;
}

function getTotalNumberBosses(raid) {
	return raid.encounters.length;
}

function getKilledNumberBosses(raidRanking) {
	return raidRanking?.encountersDefeated?.length;
}

function getTierEndDate(raid) {
	return raid.ends.eu;
}

function getRaidWorldRanking(tierEndDate, raidRanking, isCuttingEdge) {
	if (tierEndDate === null) {
		return '**In Progress**';
	}
	else {
		return `${(isCuttingEdge ? '**CE**' : '\u200b')} WR ${raidRanking?.rank}`;
	}
}

function checkIsCuttingEdge(raid, tierEndDate, raidRanking) {
	const lastBossSlug = raid.encounters[raid.encounters.length - 1].slug;
	const firstDefeatedDate = raidRanking?.encountersDefeated.find(encounter => encounter.slug === lastBossSlug)?.firstDefeated;

	return tierEndDate !== null && Date.parse(firstDefeatedDate) < Date.parse(tierEndDate);
}

function buildProgress(killedBosses, totalBosses) {
	return `${killedBosses}/${totalBosses}M`;
}

function addNewLineToAchievements() {
	raidsString = '\n' + raidsString;
	progressString = '\n' + progressString;
	worldRankingstring = '\n' + worldRankingstring;
}

function buildAchievement(raidName, progress, worldRanking) {
	raidsString = raidName + '\n' + raidsString;
	progressString = progress + '\n' + progressString;
	worldRankingstring = worldRanking + '\n' + worldRankingstring + ' ';
}

async function postAchievements(interaction) {

	const embed = new EmbedBuilder()
		.setTitle(achievementsContent.title)
		.addFields({
			name: 'Raid',
			value: `${raidsString}`,
			inline: true,
		},
		{
			name: '\u200b',
			value: `${progressString}`,
			inline: true,
		},
		{
			name: '\u200b',
			value: `${worldRankingstring}`,
			inline: true,
		})
		.setColor(Colors.Green);

	const channel = interaction.client.channels.cache.get(guildInfoChannelId);
	const achievementsPostId = await guildinfoData.get('achievementsPostId');

	if (achievementsPostId) {
		try {
			const achievementMessage = await channel.messages.fetch(achievementsPostId);

			achievementMessage.edit({ embeds: [embed] });

			console.log('Achievements updated!');
			return;
		}
		catch (error) {
			console.log('Cannot find stored achievement message, creating...');
		}
	}

	channel.send({ embeds: [embed] })
		.then(response => {
			guildinfoData.set('achievementsPostId', response.id);
			console.log(response.id);
		});
}

function buildManualAchievements(expansion) {

	const expansionAchieves = achievementsContent.achievements.filter(achievement => achievement.expansion === expansion);

	expansionAchieves.forEach(achieve => {
		raidsString = achieve.raid + '\n' + raidsString;
		progressString = achieve.progress + '\n' + progressString;
		worldRankingstring = achieve.result + '\n' + worldRankingstring + ' ';
	});
}

exports.updateAchievements = updateAchievements;