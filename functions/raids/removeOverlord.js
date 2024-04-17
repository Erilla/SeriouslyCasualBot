const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const overlords = new Keyv(databaseString, { namespace: 'overlords' });
overlords.on('error', (err) => console.error('Keyv connection error:', err));

async function removeOverlord(name) {

	return await overlords
		.delete(name)
		.then(async () => {
			return true;
		})
		.catch((error) => {
			console.error(error);
			return false;
		});
}

exports.removeOverlord = removeOverlord;
