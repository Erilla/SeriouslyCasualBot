const discord = require('discord.js');
const commando = require('discord.js-commando');
const { MessageButton, MessageActionRow } = require('discord-buttons');

module.exports = class TestCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: 'test',
      group: 'util',
      memberName: 'test',
      description: 'Dev command to test functionality.',
      examples: ['test'],
      clientPermissions: ['ADMINISTRATOR'],
      args: [
				{
					key: 'action',
					prompt: 'What action do you want to do?',
					type: 'string',
          oneOf: ['set', 'create', 'update']
				},
			],
    });
  }

  async run(msg, { action }) {
    
    const embed = new discord.MessageEmbed()
      .setTitle("Recruitment")
      .setDescription(`**What we expect from you**
      - You have to be mature, friendly and skilled. 
      - You have to actively attend the raids every week, being reliable and stable, as well as on time. 
      - We expect you to come prepared for raids, and to know your class as well as tactics. 
      - You also have to be able to take criticism.
    
    **What do we offer**
      - A 2 raid days a week schedule with the goal to get Cutting Edge each tier
      - A stable core team with numerous years of mythic experience
      - A fun and friendly atmosphere
    
    We are always recruiting players who share a similar approach to raiding as we do.
    
    If you are interested in raiding with us, please apply in #raider-applications.
    Contact @Abradix#7061, @Eclipse#2819, <@105035733558890496> or @Warzania#9808 if you have any questions.`)
      .setColor("BLUE");

    let button = new MessageButton()
      .setLabel("Apply here")
      .setStyle("url")
      .setURL("https://discord.com/channels/105036781728104448/829996038605111316/829996696833359942");

    const yes = new MessageActionRow()
      .addComponent(button);


    const message = `\`\`\`fix
    Recruitment \`\`\`
    **What we expect from you**
      - You have to be mature, friendly and skilled. 
      - You have to actively attend the raids every week, being reliable and stable, as well as on time. 
      - We expect you to come prepared for raids, and to know your class as well as tactics. 
      - You also have to be able to take criticism.
    
    **What do we offer**
      - A 2 raid days a week schedule with the goal to get Cutting Edge each tier
      - A stable core team with numerous years of mythic experience
      - A fun and friendly atmosphere
    
    We are always recruiting players who share a similar approach to raiding as we do.
    
    If you are interested in raiding with us, please apply in #raider-applications.
    Contact @Abradix#7061, @Eclipse#2819, <@105035733558890496> or @Warzania#9808 if you have any questions. ` + action

    msg.react('😄');

    return msg.channel.send(message, {
      embed: embed,
      component: yes
    });
  }
};
