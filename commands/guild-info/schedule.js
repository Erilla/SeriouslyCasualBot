const discord = require('discord.js');
const commando = require('discord.js-commando');
const Keyv = require('keyv');
const Constants = require('../../constants');

const cache = new Keyv('sqlite://../../database.sqlite3', { namespace: "cache" });
const variables = new Keyv('sqlite://../../database.sqlite3', { namespace: "variables" });

const getEmbed = () => new discord.MessageEmbed()
  .setTitle("📆 Raid Schedule")
  .addFields(
    { 
        name: `
        Day`,  
        value : `\u200b
        Wednesday
        Sunday`,
        inline: true
    },
    { 
        name: '\u200b',
        value: '\u200b',
        inline: true
    },
    { 
        name: `
        Time`,  
        value : `\u200b
        20:00 - 23:00
        20:00 - 23:00`,
        inline: true
    }
  )
  .setFooter("Server Time (GMT+1)")
  .setColor("GREEN");

const createSchedulePost = async(msg) => {
    const embed = getEmbed();

    var schedulePost = await cache.get(Constants.cache.GUILDINFO_SCHEDULE_POST);

    if (schedulePost) return msg.reply("Schedule post already exists.");

    let messageObject = {
        embed: embed
    };

    var guildInfoChannelId = await variables.get(Constants.variables.GUILDINFO_CHANNEL_ID);

    if (!guildInfoChannelId) guildInfoChannelId = msg.channel.id;

    var postedMessage = await msg.client.channels.fetch(guildInfoChannelId)
        .then(channel => channel.send('', messageObject))
        .catch(console.error);

    await cache.set(Constants.cache.GUILDINFO_SCHEDULE_POST, {
        channelId: postedMessage.channel.id,
        postId: postedMessage.id
    });

    return postedMessage;
};

const updateSchedulePost = async(msg) => {
    const embed = getEmbed();

    var schedulePost = await cache.get(Constants.cache.GUILDINFO_SCHEDULE_POST);

    if (!schedulePost) return msg.reply("Schedule Post does not currently exist.");

    let messageObject = {
        embed: embed
    };

    msg.client.channels.fetch(schedulePost.channelId)
        .then(channel => channel.messages.fetch(schedulePost.postId)
        .then(message => message.edit('', messageObject))
        .catch(console.error)
        )
        .catch(console.error);
};

const deleteSchedulePost = async(msg) => {
  var schedulePost = await cache.get(Constants.cache.GUILDINFO_SCHEDULE_POST);

  if (!schedulePost) return msg.reply("Schedule Post does not currently exist.");

  msg.client.channels.fetch(schedulePost.channelId)
    .then(channel => channel.messages.fetch(schedulePost.postId)
      .then(async message => {
        message.delete();
        await cache.delete(Constants.cache.GUILDINFO_SCHEDULE_POST);
      })
      .catch(console.error)
    )
    .catch(console.error);
};

module.exports = class ScheduleCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: 'schedule',
      group: 'guild-info',
      memberName: 'schedule',
      description: 'Command to manage the Schedule post.',
      examples: [
        'schedule create', 
        'schedule update', 
        'schedule delete'],
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
        await createSchedulePost(msg);
        break;
      case 'update':
        await updateSchedulePost(msg);
        break;
      case 'delete':
        await deleteSchedulePost(msg);
        break;
    }
  }
};
