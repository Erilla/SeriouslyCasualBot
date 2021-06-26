const commando = require('discord.js-commando');

const variableList = ["AppChannelUrl"]

class VariableArgumentType extends commando.ArgumentType {
  constructor(client) {
    super(client, 'variable');
  }

  validate(val) {
    return variableList.some(x => x.toLowerCase() == val.toLowerCase());
  }

  parse(val) {
    return val;
  }
}

module.exports = VariableArgumentType;
