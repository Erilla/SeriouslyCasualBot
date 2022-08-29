const { databaseString } = require('../../config.json');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

const Keyv = require('keyv');

const trials = new Keyv(databaseString, { namespace: 'trials' });
trials.on('error', err => console.error('Keyv connection error:', err));

async function createTrialInfoModal(interaction) {
	const modal = new ModalBuilder()
		.setCustomId('addNewTrialInfoModal')
		.setTitle('Add New Trial Info');

	await showTrialInfoModal(interaction, modal);
}

async function updateTrialInfoModal(interaction) {
	const modal = new ModalBuilder()
		.setCustomId('updateTrialInfoModal')
		.setTitle('Update Trial Info');

	await showTrialInfoModal(interaction, modal);
}

const formatDate = (date) => {
	const [dateStr] = new Date(date).toISOString().split('T');
	return dateStr;
};

async function showTrialInfoModal(interaction, modal) {

	const characterNameInput = new TextInputBuilder()
		.setCustomId('characterNameInput')
		.setLabel('Character Name')
		.setStyle(TextInputStyle.Short)
		.setMinLength(3)
		.setMaxLength(100);

	const roleInput = new TextInputBuilder()
		.setCustomId('roleInput')
		.setLabel('Role')
		.setStyle(TextInputStyle.Short)
		.setMinLength(1)
		.setMaxLength(300);

	const startDateInput = new TextInputBuilder()
		.setCustomId('startDateInput')
		.setLabel('Start Date (YYYY-MM-DD)')
		.setStyle(TextInputStyle.Short)
		.setMinLength(10)
		.setMaxLength(10);

	if (interaction.isButton()) {
		const threadId = interaction.message.thread.id;

		const trial = await trials.get(threadId);

		if (trial) {
			characterNameInput.setValue(trial.characterName);
			roleInput.setValue(trial.role);
			startDateInput.setValue(formatDate(trial.startDate));
		}
	}

	const firstActionRow = new ActionRowBuilder().addComponents(characterNameInput);
	const secondActionRow = new ActionRowBuilder().addComponents(roleInput);
	const thirdActionRow = new ActionRowBuilder().addComponents(startDateInput);

	// Add inputs to the modal
	modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

	await interaction.showModal(modal);
}

exports.createTrialInfoModal = createTrialInfoModal;
exports.updateTrialInfoModal = updateTrialInfoModal;