const {
	getPreviousWeeklyHighestMythicPlusRun,
} = require('../../services/raiderioService');
const { getHistoricalData } = require('../../services/wowauditService');

const { Buffer } = require('node:buffer');
const { databaseString, weeklyCheckChannelId } = require('../../config.json');

const Keyv = require('keyv');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', (err) => console.error('Keyv connection error:', err));

const raidersRealms = new Keyv(databaseString, { namespace: 'raidersRealms' });
raidersRealms.on('error', (err) => console.error('Keyv connection error:', err));

const getHighestMythicPlusDoneMessage = async () => {
	// raiderio
	let content = '';

	for await (const [key] of raiders.iterator()) {
		if (key !== 'SeriouslyCasualRaidersSeeded') {
			const realm = await raidersRealms.get(key);

			console.log(`Retrieving runs for ${key} ${realm}`);

			const result = await getPreviousWeeklyHighestMythicPlusRun(
				'eu',
				realm,
				key,
			);

			let runs = result.mythic_plus_previous_weekly_highest_level_runs?.map(
				(r) => r.mythic_level,
			);

			if (typeof runs === 'undefined') runs = 'Error';
			if (runs.length === 0) runs = 'None';

			content += `${key}: [${runs}]\n`;
		}
	}

	const buffer = Buffer.from(content, 'utf-8');

	const today = new Date();

	return {
		content: 'Highest Mythic+ Runs last week',
		files: [
			{
				attachment: buffer,
				name: `highest_mythicplus_${today.toISOString()}.txt`,
				description: 'Mythic+ done by raiders last week',
			},
		],
	};
};

const getWowauditData = async () => {
	const today = new Date();
	const lastWeekDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
	const previousWeek = lastWeekDate.getWeekNumber();
	return await getHistoricalData(lastWeekDate.getUTCFullYear(), previousWeek);
};

const getPreviousWeekMythicPlusMessage = async (historicData) => {
	// wowaudit
	let content = '';
	if (!historicData) {
		historicData = await getWowauditData();
	}

	const dungeonsDone = historicData.map(character => {
		return {
			characterName: character.name,
			dungeonsDone: character.data?.dungeons_done?.map(dungeons => Number(dungeons.level)).sort((a, b) => a - b).reverse() ?? null,
		};
	});

	dungeonsDone.sort((a, b) => {
		const characterA = a.characterName.toUpperCase();
		const characterB = b.characterName.toUpperCase();
		return (characterA < characterB) ? -1 : (characterA > characterB) ? 1 : 0;
	});

	for (const character of dungeonsDone) {
		const dungeons = character.dungeonsDone?.join(',') ?? 'No Data';
		content += `${character.characterName}: [${dungeons}]\n`;
	}

	const buffer = Buffer.from(content, 'utf-8');

	const today = new Date();

	return {
		content: 'Highest Mythic+ Runs last week',
		files: [
			{
				attachment: buffer,
				name: `highest_mythicplus_${today.toISOString()}.txt`,
				description: 'Mythic+ done by raiders last week',
			},
		],
	};
};

const getPreviousWeeklyGreatVaultMessage = async (historicData) => {
	// wowaudit
	let content = '';
	if (!historicData) {
		historicData = await getWowauditData();
	}

	const greatVault = historicData.map(character => {
		return {
			characterName: character.name,
			greatVault: character.data?.vault_options ?? null,
		};
	});

	greatVault.sort((a, b) => {
		const characterA = a.characterName.toUpperCase();
		const characterB = b.characterName.toUpperCase();
		return (characterA < characterB) ? -1 : (characterA > characterB) ? 1 : 0;
	});

	const longestCharacter = greatVault.reduce((a, b) => a.characterName.length > b.characterName.length ? a : b).characterName.length;

	content += `${formatColumn('', longestCharacter)}| ${formatColumn('Raid', 16)} | ${formatColumn('Dungeon', 16)} | ${formatColumn('PVP', 16)} | ${formatColumn('Delves', 16)} \n`;
	content += '-'.repeat(content.length) + '\n';

	for (const character of greatVault) {
		const raids = character.greatVault?.raids ?? null;
		const dungeons = character.greatVault?.dungeons ?? null;
		const pvp = character.greatVault?.pvp ?? null;
		const delves = character.greatVault?.delves ?? null;

		const raidOptions = raids === null ? 'No Data' : `${formatColumn(raids.option_1 ?? '', 4)}/ ${formatColumn(raids.option_2 ?? '', 4)}/ ${formatColumn(raids.option_3 ?? '', 4)}`;
		const dungeonOptions = dungeons === null ? 'No Data' : `${formatColumn(dungeons.option_1 ?? '', 4)}/ ${formatColumn(dungeons.option_2 ?? '', 4)}/ ${formatColumn(dungeons.option_3 ?? '', 4)}`;
		const pvpOptions = pvp === null ? 'No Data' : `${formatColumn(pvp.option_1 ?? '', 4)}/ ${formatColumn(pvp.option_2 ?? '', 4)}/ ${formatColumn(pvp.option_3 ?? '', 4)}`;
		const delvesOptions = delves === null ? 'No Data' : `${formatColumn(delves.option_1 ?? '', 4)}/ ${formatColumn(delves.option_2 ?? '', 4)}/ ${formatColumn(delves.option_3 ?? '', 4)}`;

		content += `${formatColumn(character.characterName, longestCharacter)}| `;
		content += `${raidOptions} | `;
		content += `${dungeonOptions} | `;
		content += `${pvpOptions} | `;
		content += `${delvesOptions}\n`;
	}

	const buffer = Buffer.from(content, 'utf-8');

	const today = new Date();

	return {
		content: 'Great Vaults last week',
		files: [
			{
				attachment: buffer,
				name: `great_vaults_${today.toISOString()}.txt`,
				description: 'Raiders Great Vaults last week',
			},
		],
	};
};

const formatColumn = (value, length) => {
	const spacesNeeded = length - value.toString().length;
	let result = value;
	result += ' '.repeat(spacesNeeded);
	return result;
};

const alertHighestMythicPlusDone = async (client) => {
	const weeklyCheckChannel = await client.channels
		.fetch(weeklyCheckChannelId)
		.catch((err) => console.error(err));
	const data = await getWowauditData();

	await weeklyCheckChannel
		.send(await getPreviousWeekMythicPlusMessage(data))
		.catch((err) => console.error(err));

	await weeklyCheckChannel
		.send(await getPreviousWeeklyGreatVaultMessage(data))
		.catch((err) => console.error(err));
};

Date.prototype.getWeekNumber = function() {
	const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};


exports.getHighestMythicPlusDoneMessage = getHighestMythicPlusDoneMessage;
exports.getPreviousWeekMythicPlusMessage = getPreviousWeekMythicPlusMessage;
exports.getPreviousWeeklyGreatVaultMessage = getPreviousWeeklyGreatVaultMessage;
exports.alertHighestMythicPlusDone = alertHighestMythicPlusDone;
