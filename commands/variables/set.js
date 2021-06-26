const commando = require('discord.js-commando');
const Keyv = require('keyv');

const keyv = new Keyv('sqlite://../../database.sqlite3');

const APPLICATION_CHANNEL_URL = 'APPLICATION_CHANNEL_URL'

const urlRegex = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/;

const setVariable = async (msg, variable, value) => {
  var variableKey;

  switch (variable.toLowerCase()) {
    case "appchannelurl":
      variableKey = APPLICATION_CHANNEL_URL;
      if (!urlRegex.test(value)) return msg.reply(`Invalid value for variable (${variable})`);
      break;
    default:
      return msg.reply(`Invalid variable (${variable}).`)
  }

  await keyv.set(APPLICATION_CHANNEL_URL, value);
  return msg.channel.send(`Variable ${variable} set to "${value}".`);
}

module.exports = class SetCommand extends commando.Command {
  constructor(client) {
    super(client, {
        name: 'set',
        group: 'variables',
        memberName: 'set',
        description: 'Command to set variables.',
        examples: ['set [AppChannelUrl] <value>'],
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
