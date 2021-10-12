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
      name: 'What we expect from you',  
      value : `
        - You have to be mature, friendly and skilled. 
        - You have to actively attend raids every week, be reliable and on time.
        - We expect you to come fully prepared for raids by researching your class and raid tactics. 
        - You have to be able to take feedback and act upon them.
        - Have some Mythic raiding experience
      `
    },
    { 
      name: 'What do we offer',  
      value : `
        - A 2 raid days a week schedule with the goal to get Cutting Edge each tier
        - A stable core team with numerous years of mythic experience
        - A fun and friendly atmosphere
      `
    },
    { 
      name: '\u200b',  
      value : 'We are always recruiting players who share a similar approach to raiding as we do.'
    },
    { 
      name: '\u200b',  
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
