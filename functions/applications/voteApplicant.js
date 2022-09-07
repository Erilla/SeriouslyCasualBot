const { databaseString } = require('../../config.json');

const Keyv = require('keyv');

const applicationVotes = new Keyv(databaseString, { namespace: 'applicationVotes' });
applicationVotes.on('error', err => console.error('Keyv connection error:', err));

const voteForApplicant = async (userId, threadId) => {
	let votes = await applicationVotes
		.get(threadId)
		.catch(err => console.error(err));
	const alreadyVoted = checkIfAlreadyVoted(userId, votes);
	votes = removeVoter(alreadyVoted, userId, votes);

	votes.forVotes.push(userId);
	await saveVotes(threadId, votes);
};

const voteNeutralApplicant = async (userId, threadId) => {
	let votes = await applicationVotes
		.get(threadId)
		.catch(err => console.error(err));
	const alreadyVoted = checkIfAlreadyVoted(userId, votes);
	votes = removeVoter(alreadyVoted, userId, votes);

	votes.neutralVotes.push(userId);
	await saveVotes(threadId, votes);
};

const voteAgainstApplicant = async (userId, threadId) => {
	let votes = await applicationVotes
		.get(threadId)
		.catch(err => console.error(err));
	const alreadyVoted = checkIfAlreadyVoted(userId, votes);
	votes = removeVoter(alreadyVoted, userId, votes);

	votes.againstVotes.push(userId);
	await saveVotes(threadId, votes);
};

const voteKekwAgainstApplicant = async (userId, threadId) => {
	await voteAgainstApplicant(userId, threadId);
	const votes = await applicationVotes
		.get(threadId)
		.catch(err => console.error(err));
	if (!votes.kekNo) {
		votes.kekNo = [];
	}
	votes.kekNo.push(userId);
	await saveVotes(threadId, votes);
};

const checkIfAlreadyVoted = (userId, votes) => {
	if (votes.forVotes.some(voter => voter === userId)) {
		return 1;
	}

	if (votes.neutralVotes.some(voter => voter === userId)) {
		return 2;
	}

	if (votes.againstVotes.some(voter => voter === userId)) {
		return 3;
	}

	return 0;
};

const removeVoter = (alreadyVoted, userId, votes) => {
	switch (alreadyVoted) {
	case 1:
		votes.forVotes = votes.forVotes.filter(voter => voter !== userId);
		break;
	case 2:
		votes.neutralVotes = votes.neutralVotes.filter(voter => voter !== userId);
		break;
	case 3:
		votes.againstVotes = votes.againstVotes.filter(voter => voter !== userId);
		if (!votes.kekNo) {
			votes.kekNo = [];
		}
		votes.kekNo = votes.kekNo.filter(voter => voter != userId);
		break;
	}

	return votes;
};

const saveVotes = async (threadId, votes) => {
	await applicationVotes
		.set(threadId, votes)
		.catch(err => console.error(err));
};

exports.voteForApplicant = voteForApplicant;
exports.voteNeutralApplicant = voteNeutralApplicant;
exports.voteAgainstApplicant = voteAgainstApplicant;
exports.voteKekwAgainstApplicant = voteKekwAgainstApplicant;