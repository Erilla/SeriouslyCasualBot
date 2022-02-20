const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commandPermissions = [];

const rest = new REST({ version: '9' }).setToken(token);

function deployCommands() {
	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);
		commands.push(command.data.toJSON());
		commandPermissions.push({ name: command.data.name, permissions: command.permissions });
	}

	rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
		.then((response) => {
			console.log('Successfully registered application commands.');
			response.forEach(registeredCommand => {
				const permissions = commandPermissions.find(p => p.name === registeredCommand.name).permissions;
				applyPermissions(registeredCommand.id, permissions);
			});

		})
		.catch(console.error);
}

function applyPermissions(commandId, permissions) {
	rest.put(Routes.applicationCommandPermissions(clientId, guildId, commandId), { body: { permissions: permissions } })
		.then(() => console.log(`Successfully applied permission to ${commandId}`))
		.catch(console.error);
}

exports.deployCommands = deployCommands;