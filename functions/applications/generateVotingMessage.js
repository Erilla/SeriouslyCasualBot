const { databaseString } = require('../../config.json');
const { ProgressBar } = require('ongoing');
const { EmbedBuilder } = require('discord.js');

const Keyv = require('keyv');

const applicationVotes = new Keyv(databaseString, { namespace: 'applicationVotes' });
applicationVotes.on('error', err => console.error('Keyv connection error:', err));

const generateVotersContent = (votes) => {

	const content = {
		for: '',
		neutral: '',
		against: '',
	};

	for (const forVote of votes.forVotes) {
		content.for += `<@${forVote}> `;
	}

	for (const neutralVote of votes.neutralVotes) {
		content.neutral += `<@${neutralVote}> `;
	}

	for (const againstVote of votes.againstVotes) {
		content.against += `<@${againstVote}> `;
	}

	return content;
};

const generateKekWs = (number) => {
	let content = '';

	for (let index = 0; index < number; index++) {
		content += '<:KEKW:777828455735230474>';
	}

	return content;
};

const generateVotingMessage = async (threadId) => {
	let votes = await applicationVotes.get(threadId);

	if (!votes) {
		votes = {
			forVotes: [],
			neutralVotes: [],
			againstVotes: [],
			kekNo: [],
		};
	}

	const votersContent = generateVotersContent(votes);
	if (!votes.kekNo) {
		votes.kekNo = [];
	}
	const kekWs = generateKekWs(votes.kekNo.length);

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

	const embed = new EmbedBuilder()
		.setColor(0x0099FF)
		.setTitle('🗳️ Votes 🗳️')
		.setDescription(`Total Votes: ${total}`)
		.addFields(
			{ name: 'For', value: `${forBar} (${votes.forVotes.length})\n ${votersContent.for}` },
			{ name: 'Neutral', value: `${neutralBar} (${votes.neutralVotes.length})\n ${votersContent.neutral}` },
			{ name: `Against ${kekWs}`, value: `${againstBar} (${votes.againstVotes.length})\n ${votersContent.against}` },
		)
		.setTimestamp();

	return { embeds: [embed] };
};

exports.generateVotingMessage = generateVotingMessage;