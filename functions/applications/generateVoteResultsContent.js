const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const applicationVotes = new Keyv(databaseString, { namespace: 'applicationVotes' });
applicationVotes.on('error', err => console.error('Keyv connection error:', err));

const generateVoteResultsContent = async (client, threadId) => {
	let content = '';
	const votes = await applicationVotes.get(threadId);

	content += 'For     | ';
	votes.forVotes.forEach(forVote => {
		const user = client.users.fetch(forVote);
		content += `[${user.username}] `;
	});
	content += '\n\n';

	content += 'Neutral | ';
	votes.neutralVotes.forEach(neutralVote => {
		const user = client.users.fetch(neutralVote);
		content += `[${user.username}] `;
	});
	content += '\n\n';

	content += 'Against | ';
	votes.againstVotes.forEach(againstVote => {
		// const user = await client.users.fetch(againstVote);
		// console.log(user);
		content += `<@${againstVote}>`;
	});
	content += '\n\n';

	return content;
};

exports.generateVoteResultsContent = generateVoteResultsContent;