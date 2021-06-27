const commando = require('discord.js-commando');
const Keyv = require('keyv');
const Constants = require('../../constants');

const variables = new Keyv('sqlite://../../database.sqlite3', { namespace: "variables" });

const deleteVariable = async (msg, variable, value) => {
  var variableKey;

  switch (variable.toLowerCase()) {
    case "appchannelurl":
      variableKey = Constants.variables.APPLICATION_CHANNEL_URL;
      break;
    case "guildinfochannelid":
      variableKey = Constants.variables.GUILDINFO_CHANNEL_ID;
      break;
    default:
      return msg.reply(`Invalid variable (${variable}).`)
  }

  await variables.delete(variableKey);
  return msg.channel.send(`Variable ${variable} deleted.`);
}

module.exports = class SetCommand extends commando.Command {
  constructor(client) {
    super(client, {
        name: 'delete',
        group: 'variables',
        memberName: 'delete',
        description: 'Command to delete variables.',
        examples: ['delete [AppChannelUrl/GuildInfoChannelId] <value>'],
        clientPermissions: ['ADMINISTRATOR'],
        args: [
        {
            key: 'variable',
            prompt: 'What variable do you want to delete?',
            type: 'variable'
        },
        {
            key: 'value',
            prompt: 'Which value do you want to delete?',
            type: 'string',
            default: ''
        }],
    });
  }

  async run(msg, { variable, value }) {
    return await deleteVariable(msg, variable, value);
  }
};
