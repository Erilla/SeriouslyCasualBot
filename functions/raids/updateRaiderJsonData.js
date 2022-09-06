const { databaseString, raiderJson } = require('../../config.json');
const fileName = `./data/${raiderJson}`;
const fs = require('fs');

const Keyv = require('keyv');
const { getRaiders } = require('./getRaiders');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', err => console.error('Keyv connection error:', err));

const updateRaiderJsonData = async () => {

	const raidersData = await getRaiders()
		.catch(err => console.error(err));

	fs.writeFile(fileName, JSON.stringify(raidersData, null, 2), function writeJSON(err) {
		if (err) return console.log(err);
		console.log(JSON.stringify(`./data/${raidersData}`));
		console.log('writing to ' + fileName);
	});
};

exports.updateRaiderJsonData = updateRaiderJsonData;