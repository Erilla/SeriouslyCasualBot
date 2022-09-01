const { applicationsViewerChannelId, databaseString } = require('../../config.json');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Keyv = require('keyv');
const { generateVotingMessage } = require('./generateVotingMessage');

const applicationVotes = new Keyv(databaseString, { namespace: 'applicationVotes' });
applicationVotes.on('error', err => console.error('Keyv connection error:', err));

async function createVotingThreadMessage(client, threadId) {

	const applicationViewerChannel = await client.channels.fetch(applicationsViewerChannelId);
	const thread =
		await applicationViewerChannel.threads
			.fetch(threadId)
			.catch(console.error);

	if (thread) {
		const votes = await applicationVotes.get(threadId);
		if (votes) {
			thread.messages
				.delete(votes.messageId)
				.catch(console.error);
		}

		const row = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('voteFor')
					.setLabel('For')
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
					.setCustomId('voteNeutral')
					.setLabel('Neutral')
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId('voteAgainst')
					.setLabel('Against')
					.setStyle(ButtonStyle.Danger),
			);

		const messageEmbed = await generateVotingMessage(threadId);

		const message = await thread.send({ ...messageEmbed, components: [row] });
		await applicationVotes.set(threadId,
			{
				messageId: message.id,
				forVotes: [],
				neutralVotes: [],
				againstVotes: [],
			});

		return true;
	}
	else {
		console.log(`Could not find Thread ${threadId}`);
		return false;
	}
}

exports.createVotingThreadMessage = createVotingThreadMessage;