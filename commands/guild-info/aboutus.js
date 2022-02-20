const discord = require('discord.js');
const commando = require('discord.js-commando');
const { MessageButton, MessageActionRow } = require('discord-buttons');
const Keyv = require('keyv');
const Constants = require('../../constants');

const cache = new Keyv('sqlite://../../database.sqlite3', { namespace: "cache" });
const variables = new Keyv('sqlite://../../database.sqlite3', { namespace: "variables" });

const getEmbed = () => new discord.MessageEmbed()
  .setTitle("<:alliance:615534209712521227> About Us")
  .setDescription(`**<SeriouslyCasual>** is a two-day Alliance mythic raiding guild. We were founded in 2013 and continue to progress every raid tier at Silvermoon-EU. 
  
  Our aim is to obtain every Cutting Edge achievement there is while respecting the fact this game is NOT someone’s second job.

  If you’re a fan of banter, memes, and high-end progression, then welcome to your new home.
  `)
  .setColor("GREEN");

const getButton = () => {
    const buttonRow = new MessageActionRow();

    let raiderIoButton = new MessageButton()
      .setLabel("RaiderIO")
      .setStyle("url")
      .setEmoji("858702994497208340")
      .setURL("https://raider.io/guilds/eu/silvermoon/SeriouslyCasual");

    buttonRow.addComponent(raiderIoButton);

    let wowProgressButton = new MessageButton()
      .setLabel("WoWProgress")
      .setStyle("url")
      .setEmoji("858703946302750740")
      .setURL("https://www.wowprogress.com/guild/eu/silvermoon/SeriouslyCasual");

    buttonRow.addComponent(wowProgressButton);

    let warcraftLogsButton = new MessageButton()
      .setLabel("Warcraft Logs")
      .setStyle("url")
      .setEmoji("858704238036123688")
      .setURL("https://www.warcraftlogs.com/guild/id/486913");

    buttonRow.addComponent(warcraftLogsButton);

  return buttonRow;
}

const createAboutUsPost = async(msg) => {
    const embed = getEmbed();

    var aboutUsPost = await cache.get(Constants.cache.GUILDINFO_ABOUTUS_POST);

    if (aboutUsPost) return msg.reply("About Us post already exists.");

    let messageObject = {
        embed: embed
    };

    const buttonRow = getButton();

    messageObject.component = buttonRow;

    var guildInfoChannelId = await variables.get(Constants.variables.GUILDINFO_CHANNEL_ID);

    if (!guildInfoChannelId) guildInfoChannelId = msg.channel.id;

    var postedMessage = await msg.client.channels.fetch(guildInfoChannelId)
        .then(channel => channel.send('', messageObject))
        .catch(console.error);

    await cache.set(Constants.cache.GUILDINFO_ABOUTUS_POST, {
        channelId: postedMessage.channel.id,
        postId: postedMessage.id
    });

    return postedMessage;
};

const updateAboutUsPost = async(msg) => {
    const embed = getEmbed();

    var aboutUsPost = await cache.get(Constants.cache.GUILDINFO_ABOUTUS_POST);

    if (!aboutUsPost) return msg.reply("About Us Post does not currently exist.");

    let messageObject = {
        embed: embed
    };

    const buttonRow = getButton();

    messageObject.component = buttonRow;

    msg.client.channels.fetch(aboutUsPost.channelId)
        .then(channel => channel.messages.fetch(aboutUsPost.postId)
        .then(message => message.edit('', messageObject))
        .catch(console.error)
        )
        .catch(console.error);
};

const deleteAboutUsPost = async(msg) => {
  var aboutUsPost = await cache.get(Constants.cache.GUILDINFO_ABOUTUS_POST);

  if (!aboutUsPost) return msg.reply("About Us Post does not currently exist.");

  msg.client.channels.fetch(aboutUsPost.channelId)
    .then(channel => channel.messages.fetch(aboutUsPost.postId)
      .then(async message => {
        message.delete();
        await cache.delete(Constants.cache.GUILDINFO_ABOUTUS_POST);
      })
      .catch(console.error)
    )
    .catch(console.error);
};

module.exports = class AboutUsCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: 'aboutus',
      group: 'guild-info',
      memberName: 'aboutus',
      description: 'Command to manage the aboutus post.',
      examples: [
        'aboutus create', 
        'aboutus update', 
        'aboutus delete'],
      clientPermissions: ['ADMINISTRATOR'],
      args: [
				{
					key: 'action',
					prompt: 'What action do you want to do?',
					type: 'string',
          oneOf: ['create', 'update', 'delete']
				}
			],
    });
  }

  async run(msg, { action }) {

    switch (action) {
      case 'create':
        await createAboutUsPost(msg);
        break;
      case 'update':
        await updateAboutUsPost(msg);
        break;
      case 'delete':
        await deleteAboutUsPost(msg);
        break;
    }
  }
};
