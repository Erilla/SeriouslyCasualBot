const { removeTrial } = require('../functions/trial-review/removeTrial');
const {
	updateTrialInfoModal,
	createTrialInfoModal,
} = require('../functions/trial-review/trialInfoModal');
const {
	createTrialReviewThread,
} = require('../functions/trial-review/createTrialReviewThread');
const {
	dateInputValidator,
} = require('../functions/trial-review/dateInputValidator');
const {
	changeTrialInfo,
} = require('../functions/trial-review/changeTrialInfo');
const {
	archiveApplicationThread,
} = require('../functions/applications/archiveApplicationThread');
const {
	voteForApplicant,
	voteNeutralApplicant,
	voteAgainstApplicant,
	voteKekwAgainstApplicant,
} = require('../functions/applications/voteApplicant');
const {
	generateVotingMessage,
} = require('../functions/applications/generateVotingMessage');
const { extendTrial } = require('../functions/trial-review/extendTrial');
const { markToPromote } = require('../functions/trial-review/markToPromote');
const wait = require('util').promisify(setTimeout);
const { updateLootResponse } = require('../functions/loot/updateLootResponse');
const { updateRaiderDiscordUser } = require('../functions/raids/updateRaiderDiscordUser');
const { ignoreCharacter } = require('../functions/raids/ignoreCharacter');
const adminRoleIds = ['255630010088423425', '170611904752910336'];

function checkPermissions(member) {
	const roles = member.roles.cache;

	let found = false;

	for (const adminRoleId of adminRoleIds) {
		if (roles.get(adminRoleId)) {
			found = true;
		}
	}

	return found;
}

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		if (interaction.isCommand()) {
			console.log(
				`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`,
			);
			const executedCommand = interaction.client.commands.get(
				interaction.commandName,
			);

			if (!executedCommand) return;

			try {
				await executedCommand.execute(interaction);
			}
			catch (error) {
				console.error(error);
				await interaction.reply({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			}
		}
		else if (interaction.isButton()) {
			if (interaction.customId === 'closeTrial') {
				console.log(
					`${interaction.user.tag} in #${interaction.channel.name} clicked the closeTrial button.`,
				);

				await removeTrial(interaction.message.thread.id);
				await interaction.message.thread
					.send('Closing Trial Thread')
					.catch((err) => console.error(err));
				await interaction.message.thread
					.setArchived(true)
					.catch((err) => console.error(err));

				return await interaction
					.update({
						content: `:red_square: **TRIAL ENDED** :red_square:\n${interaction.message}`,
						components: [],
						ephemeral: true,
					})
					.catch((err) => console.error(err));
			}
			else if (interaction.customId === 'updateTrialInfo') {
				await updateTrialInfoModal(interaction);
			}
			else if (interaction.customId === 'extendTrialByOneWeek') {
				const content = await extendTrial(interaction.message.thread.id);

				await interaction
					.update({
						content,
					})
					.catch((err) => console.error(err));
			}
			else if (interaction.customId === 'markForPromotion') {
				const result = await markToPromote(
					interaction.client,
					interaction.message.thread.id,
				);
				if (result) {
					await interaction
						.update({
							content: `🟩 **To Be Promoted** 🟩\n${interaction.message}`,
						})
						.catch((err) => console.error(err));
				}
				else {
					await interaction
						.reply({
							content: 'Already marked for promotion',
							ephemeral: true,
						})
						.catch((err) => console.error(err));
				}
			}
			else if (interaction.customId === 'acceptedApplicant') {
				if (checkPermissions(interaction.member)) {
					await createTrialInfoModal(interaction);
				}
				else {
					await interaction
						.reply({
							content: 'Insufficent permissions',
							ephemeral: true,
						})
						.catch((err) => console.error(err));
				}
			}
			else if (interaction.customId === 'rejectedApplicant') {
				if (checkPermissions(interaction.member)) {
					await archiveApplicationThread(
						interaction.client,
						interaction.message.thread.id,
						'Rejected',
					);
				}
				else {
					await interaction
						.reply({
							content: 'Insufficent permissions',
							ephemeral: true,
						})
						.catch((err) => console.error(err));
				}
			}
			else if (interaction.customId === 'voteFor') {
				await voteForApplicant(interaction.user.id, interaction.channelId);
				await interaction
					.update(await generateVotingMessage(interaction.channelId))
					.catch((err) => console.error(err));
			}
			else if (interaction.customId === 'voteNeutral') {
				await voteNeutralApplicant(interaction.user.id, interaction.channelId);
				await interaction
					.update(await generateVotingMessage(interaction.channelId))
					.catch((err) => console.error(err));
			}
			else if (interaction.customId === 'voteAgainst') {
				await voteAgainstApplicant(interaction.user.id, interaction.channelId);
				await interaction
					.update(await generateVotingMessage(interaction.channelId))
					.catch((err) => console.error(err));
			}
			else if (interaction.customId === 'voteKekWAgainst') {
				await voteKekwAgainstApplicant(
					interaction.user.id,
					interaction.channelId,
				);
				await interaction
					.update(await generateVotingMessage(interaction.channelId))
					.catch((err) => console.error(err));
			}
			else if (interaction.customId.startsWith('updateLootResponse')) {
				const [, response, bossId] = interaction.customId.split('|');

				await interaction
					.update(
						await updateLootResponse(
							interaction.client,
							response,
							bossId,
							interaction.user.id,
						),
					)
					.catch((err) => console.error(err));
			}
			else if (interaction.customId === 'ignore_missing_character') {
				const characterName = interaction.message.content;

				if (await ignoreCharacter(characterName)) {
					await interaction.channel
						.send({
							content: `${characterName} ignored.`,
						})
						.catch((err) => console.error(err));
					await interaction.message.delete();
				}
				else {
					await interaction
						.reply({
							content: `Could not ignore character ${characterName}`,
						})
						.catch((err) => console.error(err));
					await wait(2000);
					await interaction.deleteReply().catch((err) => console.error(err));
				}
			}
		}
		else if (interaction.isModalSubmit()) {
			if (interaction.customId === 'addNewTrialInfoModal') {
				const characterName =
					interaction.fields.getTextInputValue('characterNameInput');
				const role = interaction.fields.getTextInputValue('roleInput');
				const startDate =
					interaction.fields.getTextInputValue('startDateInput');

				if (dateInputValidator(startDate)) {
					await createTrialReviewThread(interaction.client, {
						characterName,
						role,
						startDate: new Date(startDate),
					});

					if (interaction.message?.thread?.id) {
						await archiveApplicationThread(
							interaction.client,
							interaction.message.thread.id,
							'Accepted',
						);
					}

					await interaction
						.reply({
							content: 'Successfully created Trial Thread',
						})
						.catch((err) => console.error(err));
					await wait(1000);
					await interaction.deleteReply().catch((err) => console.error(err));
				}
				else {
					await interaction
						.reply({
							content: 'Invalid Date',
						})
						.catch((err) => console.error(err));
					await wait(1000);
					await interaction.deleteReply().catch((err) => console.error(err));
				}
			}
			else if (interaction.customId === 'updateTrialInfoModal') {
				const threadId = interaction.message.thread.id;
				const characterName =
					interaction.fields.getTextInputValue('characterNameInput');
				const role = interaction.fields.getTextInputValue('roleInput');
				const startDate =
					interaction.fields.getTextInputValue('startDateInput');

				const trial = {
					characterName,
					role,
					startDate,
				};

				await changeTrialInfo(interaction.client, threadId, trial);

				await interaction
					.reply({
						content: `Successfully updated Trial with thread Id ${threadId}`,
					})
					.catch((err) => console.error(err));

				await wait(1000);
				await interaction.deleteReply().catch((err) => console.error(err));
			}
		}
		else if (interaction.isUserSelectMenu()) {
			if (interaction.customId === 'missing_user_select') {
				const characterName = interaction.message.content;
				const user = interaction.values[0];

				if (await updateRaiderDiscordUser(characterName, user)) {
					await interaction.channel
						.send({
							content: `Updated ${characterName} with <@${user}>`,
						})
						.catch((err) => console.error(err));
					await interaction.message.delete();
				}
				else {
					await interaction
						.reply({
							content: `Could not update raider ${characterName}`,
						})
						.catch((err) => console.error(err));
					await wait(2000);
					await interaction.deleteReply().catch((err) => console.error(err));
				}
			}
		}
	},
};
