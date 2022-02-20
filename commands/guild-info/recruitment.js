const discord = require('discord.js');
const commando = require('discord.js-commando');
const { MessageButton, MessageActionRow } = require('discord-buttons');
const Keyv = require('keyv');
const Constants = require('../../constants');

const cache = new Keyv('sqlite://../../database.sqlite3', { namespace: "cache" });
const variables = new Keyv('sqlite://../../database.sqlite3', { namespace: "variables" });

const getEmbed = () => new discord.MessageEmbed()
  .setTitle("📝 Recruitment")
  .addFields(
    { 
      name: '\u200b',  
      value : 'A SeriouslyCasual player is one that knows the ins and outs of their class, can consistently perform up to a mythic raiding standard, and enjoys a relaxed social environment. If that sounds like you, then we’d love to hear from you!'
    },
    { 
      name: '\u200b',  
      value : `\u200b`
    },
    { 
      name: 'What We Want From You',  
      value : `
        - Know everything there is to know about your class at any given time. This includes rotations, use of defensives, consumables, legendaries, specs, enchants, and the like.
        - Be proactive and prepared for every raid encounter. This means researching boss fights.
        - Be mature and friendly. Bonus points if you’re funny.
        - Attend at least 90% of our scheduled raids within any given tier.
        - Be ready to receive criticism (where its warranted, of course).
      `
    },
    { 
      name: '\u200b',  
      value : `\u200b`
    },
    { 
      name: 'What We Can Give You',  
      value : `
        - A stable mythic raiding guild with over 9 years of raiding at World of Warcraft’s highest levels.
        - A platform where you can constantly learn and grow as a player.
        - A great social environment with an active Discord for WoW and even other gaming interests!
        - Memes. So many memes.
      `
    },
    { 
      name: '\u200b',  
      value : `If you're an exceptional player and your class isn't listed, we still encourage you to apply. Exceptional players will always be considered regardless of class or spec.`
    },
    { 
      name: '\u200b',  
      value : `\u200b`
    },
    { 
      name: 'Need to know more? Contact these guys!',  
      value : 'Contact <@101060314950283264>, <@230118286229110784>, <@105035733558890496> or <@205969498908524544> if you have any questions.'
    },
  )
  .setColor("GREEN");

const getButton = (applicationChannelUrl) => {
  const buttonRow = new MessageActionRow();
    let button = new MessageButton()
      .setLabel("Apply here")
      .setStyle("url")
      .setURL(applicationChannelUrl);

    buttonRow.addComponent(button);

  return buttonRow;
}

const createRecruitmentPost = async(msg) => {
  const embed = getEmbed();

  var recruitmentPost = await cache.get(Constants.cache.GUILDINFO_RECRUITMENT_POST);

  if (recruitmentPost) return msg.reply("Recruitment post already exists.");

  let applicationChannelUrl = await variables.get(Constants.variables.APPLICATION_CHANNEL_URL)

  let messageObject = {
    embed: embed
  };

  if (applicationChannelUrl)
  {
    const buttonRow = getButton(applicationChannelUrl);

    messageObject.component = buttonRow;
  } 
  else 
  {
    msg.reply("Application Channel Url not set, so no button will appear for recruitment.");
  }

  var guildInfoChannelId = await variables.get(Constants.variables.GUILDINFO_CHANNEL_ID);

  if (!guildInfoChannelId) guildInfoChannelId = msg.channel.id;

  var postedMessage = await msg.client.channels.fetch(guildInfoChannelId)
    .then(channel => channel.send('', messageObject))
    .catch(console.error);

  await cache.set(Constants.cache.GUILDINFO_RECRUITMENT_POST, {
    channelId: postedMessage.channel.id,
    postId: postedMessage.id
  });

  return postedMessage;
};

const updateRecruitmentPost = async(msg) => {
  const embed = getEmbed();

  var recruitmentPost = await cache.get(Constants.cache.GUILDINFO_RECRUITMENT_POST);

  if (!recruitmentPost) return msg.reply("Recruitment Post does not currently exist.");

  let applicationChannelUrl = await variables.get(Constants.variables.APPLICATION_CHANNEL_URL)

  let messageObject = {
    embed: embed
  };

  if (applicationChannelUrl)
  {
    const buttonRow = getButton(applicationChannelUrl);

    messageObject.component = buttonRow;
  } 
  else 
  {
    msg.reply("Application Channel Url not set, so no button will appear for recruitment.");
  }

  msg.client.channels.fetch(recruitmentPost.channelId)
    .then(channel => channel.messages.fetch(recruitmentPost.postId)
      .then(message => message.edit('', messageObject))
      .catch(console.error)
    )
    .catch(console.error);
};

const deleteRecruitmentPost = async(msg) => {
  var recruitmentPost = await cache.get(Constants.cache.GUILDINFO_RECRUITMENT_POST);

  if (!recruitmentPost) return msg.reply("Recruitment Post does not currently exist.");

  msg.client.channels.fetch(recruitmentPost.channelId)
    .then(channel => channel.messages.fetch(recruitmentPost.postId)
      .then(async message => {
        message.delete();
        await cache.delete(Constants.cache.GUILDINFO_RECRUITMENT_POST);
      })
      .catch(console.error)
    )
    .catch(console.error);
};

module.exports = class RecruitmentCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: 'recruitment',
      group: 'guild-info',
      memberName: 'recruitment',
      description: 'Command to manage the recruitment post.',
      examples: [
        'recruitment create', 
        'recruitment update', 
        'recruitment delete'],
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
        await createRecruitmentPost(msg);
        break;
      case 'update':
        await updateRecruitmentPost(msg);
        break;
      case 'delete':
        await deleteRecruitmentPost(msg);
        break;
    }
  }
};
