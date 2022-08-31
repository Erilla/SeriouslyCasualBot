const { databaseString } = require('../../config.json');
const { ProgressBar } = require('ongoing');

const Keyv = require('keyv');

const applicationVotes = new Keyv(databaseString, { namespace: 'applicationVotes' });
applicationVotes.on('error', err => console.error('Keyv connection error:', err));

const generateVotingMessage = async (threadId) => {
	let content = '';
	let votes = await applicationVotes.get(threadId);

	if (!votes) {
		votes = {
			forVotes: [],
			neutralVotes: [],
			againstVotes: [],
		};
	}

	const total = votes.forVotes.length + votes.neutralVotes.length + votes.againstVotes.length;

	const bar = new ProgressBar(
		':bar',
		{
			total: 50,
			width: 10,
			completedChar: '⬜',
			incompletedChar: '⬛',
		});

	const forBar = bar.update(total ? votes.forVotes.length / total : 0);
	const neutralBar = bar.update(total ? votes.neutralVotes.length / total : 0);
	const againstBar = bar.update(total ? votes.againstVotes.length / total : 0);

	content += '```';
	content += `Total Votes: ${total}\n`;
	content += `For     | ${forBar} (${votes.forVotes.length})\n\n`;
	content += `Neutral | ${neutralBar} (${votes.neutralVotes.length})\n\n`;
	content += `Against | ${againstBar} (${votes.againstVotes.length})\n`;
	content += '```';

	return content;
};

exports.generateVotingMessage = generateVotingMessage;