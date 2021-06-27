const discord = require('discord.js');
const commando = require('discord.js-commando');
const { MessageButton, MessageActionRow } = require('discord-buttons');
const Keyv = require('keyv');
const Constants = require('../../constants');

const keyv = new Keyv('sqlite://../../database.sqlite3');

const getEmbed = () => new discord.MessageEmbed()
  .setTitle("📝 Recruitment")
  .addFields(
    { 
      name: 'What we expect from you',  
      value : `
        - You have to be mature, friendly and skilled. 
        - You have to actively attend the raids every week, being reliable and stable, as well as on time. 
        - We expect you to come prepared for raids, and to know your class as well as tactics. 
        - You also have to be able to take criticism.
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
      value : 'Contact @Abradix#7061, @Eclipse#2819, <@105035733558890496> or @Warzania#9808 if you have any questions.'
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

  var recruitmentPost = await keyv.get(Constants.GUILDINFO_RECRUITMENT_POST);

  if (recruitmentPost) return msg.reply("Recruitment post already exists.");

  let applicationChannelUrl = await keyv.get(Constants.APPLICATION_CHANNEL_URL)

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

  var guildInfoChannelId = await keyv.get(Constants.GUILDINFO_CHANNEL_ID);

  if (!guildInfoChannelId) guildInfoChannelId = msg.channel.id;

  var postedMessage = await msg.client.channels.fetch(guildInfoChannelId)
    .then(channel => channel.send('', messageObject))
    .catch(console.error);

  await keyv.set(Constants.GUILDINFO_RECRUITMENT_POST, {
    channelId: postedMessage.channel.id,
    postId: postedMessage.id
  });

  return postedMessage;
};

const updateRecruitmentPost = async(msg) => {
  const embed = getEmbed();

  var recruitmentPost = await keyv.get(Constants.GUILDINFO_RECRUITMENT_POST);

  if (!recruitmentPost) return msg.reply("Recruitment Post does not currently exist.");

  let applicationChannelUrl = await keyv.get(Constants.APPLICATION_CHANNEL_URL)

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
  var recruitmentPost = await keyv.get(Constants.GUILDINFO_RECRUITMENT_POST);

  if (!recruitmentPost) return msg.reply("Recruitment Post does not currently exist.");

  msg.client.channels.fetch(recruitmentPost.channelId)
    .then(channel => channel.messages.fetch(recruitmentPost.postId)
      .then(async message => {
        message.delete();
        await keyv.delete(Constants.GUILDINFO_RECRUITMENT_POST);
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
				},
        {
					key: 'variable',
					prompt: 'What variable do you want to modify?',
					type: 'string',
          default: ''
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

    await msg.delete();
  }
};
