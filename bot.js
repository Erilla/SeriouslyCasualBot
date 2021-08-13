/* eslint-disable no-console */
const Discord = require("discord.js");
const commando = require('discord.js-commando');
const path = require('path');
const oneLine = require('common-tags').oneLine;
const sqlite = require('sqlite');
const Config = require('./config');
const Security = require('./security')
const disbut = require('discord-buttons');

const token = Security.decryptWithAES(Config.botToken);

const client = new commando.Client({
  owner: Config.owners,
  commandPrefix: Config.prefix
});

client
  .on('error', console.error)
  .on('warn', console.warn)
  .on('debug', console.log)
  .on('ready', () => {
    console.log(`Client ready; logged in as ${client.user.username}#${client.user.discriminator} (${client.user.id})`);
  })
  .on('disconnect', () => { console.warn('Disconnected!'); })
  .on('reconnecting', () => { console.warn('Reconnecting...'); })
  .on('commandError', (cmd, err) => {
    if (err instanceof commando.FriendlyError) return;
    console.error(`Error in command ${cmd.groupID}:${cmd.memberName}`, err);
  })
  .on('commandBlocked', (msg, reason) => {
    console.log(oneLine`
			Command ${msg.command ? `${msg.command.groupID}:${msg.command.memberName}` : ''}
			blocked; ${reason}
		`);
  })
  .on('commandPrefixChange', (guild, prefix) => {
    console.log(oneLine`
			Prefix ${prefix === '' ? 'removed' : `changed to ${prefix || 'the default'}`}
			${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
		`);
  })
  .on('commandStatusChange', (guild, command, enabled) => {
    console.log(oneLine`
			Command ${command.groupID}:${command.memberName}
			${enabled ? 'enabled' : 'disabled'}
			${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
		`);
  })
  .on('groupStatusChange', (guild, group, enabled) => {
    console.log(oneLine`
			Group ${group.id}
			${enabled ? 'enabled' : 'disabled'}
			${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
		`);
  })
  .on('message', (msg) => {
    const wipeFestId = '354726853459836938';
    const listenChannel = '507252876356354069';
    const postChannel = '875695733016244234';

    if (msg.channel.id === listenChannel && msg.author.id === wipeFestId) {
      var command = msg.content.match('!wipefest listen[^`]*');

      if (command && command.length === 1) {
        msg.client.channels.fetch(postChannel)
        .then(channel => channel.send(command[0]))
        .catch(console.error);

        msg.client.channels.fetch(listenChannel)
        .then(channel => channel.send(`Posting command '${command[0]}'`))
        .catch(console.error);
      }
    }
  });

client.setProvider(
  sqlite.open(path.join(__dirname, 'database.sqlite3')).then(db => new commando.SQLiteProvider(db))
).catch(console.error);

client.registry
  .registerGroup('guild-info', 'GuildInfo')
  .registerGroup('variables', 'Variables')
  .registerGroup('cache', 'Cache')
  .registerDefaults()
  .registerTypesIn(path.join(__dirname, 'types'))
  .registerCommandsIn(path.join(__dirname, 'commands'));

client.login(token);

disbut(client);