const commando = require('discord.js-commando');
const Keyv = require('keyv');
const Constants = require('../../constants');

const cache = new Keyv('sqlite://../../database.sqlite3', { namespace: "cache" });

module.exports = class ClearCacheCommand extends commando.Command {
  constructor(client) {
    super(client, {
        name: 'clearcache',
        group: 'cache',
        memberName: 'clearcache',
        description: 'Command to clear the cache.',
        examples: ['clearcache'],
        clientPermissions: ['ADMINISTRATOR']
    });
  }

  async run() {
    return await cache.clear();
  }
};
