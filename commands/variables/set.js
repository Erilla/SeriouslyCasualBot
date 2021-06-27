const commando = require('discord.js-commando');
const Keyv = require('keyv');
const Constants = require('../../constants');

const variables = new Keyv('sqlite://../../database.sqlite3', { namespace: "variables" });

const urlRegex = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/;

const setVariable = async (msg, variable, value) => {
  var variableKey;

  switch (variable.toLowerCase()) {
    case "appchannelurl":
      variableKey = Constants.variables.APPLICATION_CHANNEL_URL;
      if (!urlRegex.test(value)) return msg.reply(`Invalid value for variable (${variable})`);
      break;
    case "guildinfochannelid":
      variableKey = Constants.variables.GUILDINFO_CHANNEL_ID;
      break;
    default:
      return msg.reply(`Invalid variable (${variable}).`)
  }

  await variables.set(variableKey, value);
  return msg.channel.send(`Variable ${variable} set to "${value}".`);
}

module.exports = class SetCommand extends commando.Command {
  constructor(client) {
    super(client, {
        name: 'set',
        group: 'variables',
        memberName: 'set',
        description: 'Command to set variables.',
        examples: ['set [AppChannelUrl/GuildInfoChannelId] <value>'],
        clientPermissions: ['ADMINISTRATOR'],
        args: [
        {
            key: 'variable',
            prompt: 'What variable do you want to modify?',
            type: 'variable'
        },
        {
            key: 'value',
            prompt: 'What value do you want to set it to',
            type: 'string'
        }],
    });
  }

  async run(msg, { variable, value }) {
    return await setVariable(msg, variable, value);
  }
};
