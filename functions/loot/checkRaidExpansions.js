const { lootChannelId } = require('../../config.json');
const { getRaidStaticData } = require('../../services/raiderioService');
const { addLootPost } = require('../loot/addLootPost');

const checkRaidExpansions = async (client) => {
	console.log('Checking Raid Expansions for Loot Posts');

	const initialExpansion = 9;
	let complete = false;
	let currentExpansion = initialExpansion;

	while (!complete) {
		console.log(`Checking Expansion ${currentExpansion}`);

		const raidStaticDataResponse = await getRaidStaticData(currentExpansion);

		const currentDate = new Date();

		if (
			raidStaticDataResponse?.response?.status &&
			raidStaticDataResponse?.response?.status === 400
		) {
			console.log(
				`Response came back as ${raidStaticDataResponse?.response?.status}`,
			);
			complete = true;
		}
		else if (raidStaticDataResponse?.raids) {
			raidStaticDataResponse?.raids?.sort((a, b) => {
				if (new Date(a.ends.eu) > currentDate) return 1;
				return a.ends.eu > b.ends.eu ? 1 : -1;
			});

			for await (const raid of raidStaticDataResponse.raids) {
				if (new Date(raid.ends.eu) > currentDate) {
					console.log('Found current raid');

					await client.channels.fetch(lootChannelId).then(async (channel) => {
						const encounters = raid.encounters;

						for await (const encounter of encounters) {
							console.log(`New Boss found - Adding post [${encounter.name}]`);

							await addLootPost(channel, {
								id: encounter.id,
								name: encounter.name,
								url: `https://www.wowhead.com/npc=${encounter.id}`,
							});
						}
					});
					complete = true;
					break;
				}
			}
		}

		console.log('Completed check for Raid Expansions for Loot Posts');

		currentExpansion++;
	}
};

exports.checkRaidExpansions = checkRaidExpansions;
