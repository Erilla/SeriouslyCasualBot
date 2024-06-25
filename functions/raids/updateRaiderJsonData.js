const { databaseString, raiderJson } = require('../../config.json');
const fileName = `./data/${raiderJson}`;
const fs = require('fs');

const Keyv = require('keyv');

const raiders = new Keyv(databaseString, { namespace: 'raiders' });
raiders.on('error', err => console.error('Keyv connection error:', err));

const updateRaiderJsonData = async () => {

	const raidersObject = [];

	for await (const [key, value] of raiders.iterator()) {
		raidersObject.push({ 'name': key, 'userId': value });
	}

	const json = JSON.stringify(raidersObject, null, 2);

	fs.writeFile(fileName, json, async function writeJSON(err) {
		if (err) return console.log(err);
		console.log('writing to ' + fileName);
	});
};

exports.updateRaiderJsonData = updateRaiderJsonData;