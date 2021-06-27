const discord = require('discord.js');
const commando = require('discord.js-commando');
const Keyv = require('keyv');
const Constants = require('../../constants');

const cache = new Keyv('sqlite://../../database.sqlite3', { namespace: "cache" });
const variables = new Keyv('sqlite://../../database.sqlite3', { namespace: "variables" });

const getEmbed = () => new discord.MessageEmbed()
  .setTitle("🏆 Current Progress & Past Achievements")
  .addFields(
    { 
        name: `Raid`,  
        value : `\u200b
        Castle Nathria

        Ny'alotha, the Waking City
        The Eternal Palace
        Battle of Dazar'alor
        Uldir
        
        Antorus, the Burning Throne
        Tomb of Sargeras
        The Nighthold
        Trial of Valor
        The Emerald Nightmare`,
        inline: true
    },
    { 
        name: `\u200b`,  
        value : `\u200b
        10/10M

        12/12M
          8/8M
          9/9M
          8/8M
        
        11/11M
          8/9M
        10/10M
          3/3M
          7/7M`,
        inline: true
    },
    { 
        name: `\u200b`,  
        value : `\u200b
        **CE**

        **CE**
        **CE**
        **CE**
        **CE**
        
        **CE**
        
        **CE**
        **CE**
        **CE**`,
        inline: true
    }
  )
  .setFooter("Times are in Server Time (GMT+1)")
  .setColor("GREEN");

const createAchievementsPost = async(msg) => {
    const embed = getEmbed();

    var achievementsPost = await cache.get(Constants.cache.GUILDINFO_ACHIEVEMENTS_POST);

    if (achievementsPost) return msg.reply("Achievements post already exists.");

    let messageObject = {
        embed: embed
    };

    var guildInfoChannelId = await variables.get(Constants.variables.GUILDINFO_CHANNEL_ID);

    if (!guildInfoChannelId) guildInfoChannelId = msg.channel.id;

    var postedMessage = await msg.client.channels.fetch(guildInfoChannelId)
        .then(channel => channel.send('', messageObject))
        .catch(console.error);

    await cache.set(Constants.cache.GUILDINFO_ACHIEVEMENTS_POST, {
        channelId: postedMessage.channel.id,
        postId: postedMessage.id
    });

    return postedMessage;
};

const updateAchievementsPost = async(msg) => {
    const embed = getEmbed();

    var achievementsPost = await cache.get(Constants.cache.GUILDINFO_ACHIEVEMENTS_POST);

    if (!achievementsPost) return msg.reply("Achievements Post does not currently exist.");

    let messageObject = {
        embed: embed
    };

    msg.client.channels.fetch(achievementsPost.channelId)
        .then(channel => channel.messages.fetch(achievementsPost.postId)
        .then(message => message.edit('', messageObject))
        .catch(console.error)
        )
        .catch(console.error);
};

const deleteAchievementsPost = async(msg) => {
  var achievementsPost = await cache.get(Constants.cache.GUILDINFO_ACHIEVEMENTS_POST);

  if (!achievementsPost) return msg.reply("Achievements Post does not currently exist.");

  msg.client.channels.fetch(achievementsPost.channelId)
    .then(channel => channel.messages.fetch(achievementsPost.postId)
      .then(async message => {
        message.delete();
        await cache.delete(Constants.cache.GUILDINFO_ACHIEVEMENTS_POST);
      })
      .catch(console.error)
    )
    .catch(console.error);
};

module.exports = class AchievementsCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: 'achievements',
      group: 'guild-info',
      memberName: 'achievements',
      description: 'Command to manage the Achievements post.',
      examples: [
        'achievements create', 
        'achievements update', 
        'achievements delete'],
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
        await createAchievementsPost(msg);
        break;
      case 'update':
        await updateAchievementsPost(msg);
        break;
      case 'delete':
        await deleteAchievementsPost(msg);
        break;
    }

    await msg.delete();
  }
};
