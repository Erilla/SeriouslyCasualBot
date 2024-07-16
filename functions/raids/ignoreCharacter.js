const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const ignoredCharacters = new Keyv(databaseString, { namespace: 'ignoredCharacters' });
ignoredCharacters.on('error', err => console.error('Keyv connection error:', err));

const ignoreCharacter = async (name) => {
	return await ignoredCharacters.set(name)
		.then(async () => {
			return true;
		})
		.catch((error) => {
			console.error(error);
			return false;
		});
};

const removeIgnoredCharacter = async (name) => {
	return await ignoredCharacters.delete(name)
		.then(async () => {
			return true;
		})
		.catch((error) => {
			console.error(error);
			return false;
		});
};

const getIgnoredCharacters = async () => {
	let result = '';

	for await (const [key] of ignoredCharacters.iterator()) {
		result += `${key}\n`;
	}

	return result;
};

const getStoredIgnoredCharacters = async () => {
	const raidersObject = [];

	for await (const [key] of ignoredCharacters.iterator()) {
		raidersObject.push(key);
	}
	return raidersObject;
};

exports.ignoreCharacter = ignoreCharacter;
exports.removeIgnoredCharacter = removeIgnoredCharacter;
exports.getIgnoredCharacters = getIgnoredCharacters;
exports.getStoredIgnoredCharacters = getStoredIgnoredCharacters;
