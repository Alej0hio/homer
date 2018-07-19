const mtz = require('moment-timezone');
const Event = require('../structures/Event');

class ReadyEvent extends Event {
  constructor(client) {
    super(client, 'ready');
  }

  async handle() {
    this.client.ready = true;

    // Notifying sharder
    this.client.shard.send({
      type: 'log',
      message: `This shard is READY - ${this.client.guilds.size} servers - ${this.client.users.size} users`,
    });

    // Sending message in logChannel
    this.client.sendMessage(this.client.config.logChannel, `\`[${mtz().format('HH:mm:ss')}]\` 📡 Shard ID **${this.client.shard.id}** is now **READY**.`);
    this.client.updateMessage(this.client.config.statusChannel, this.client.config.status[`shard_${this.client.shard.id}`], `◻ Shard ${this.client.shard.id}: **${this.client.constants.status.online} Online**`);

    // Update game & bot list count
    this.client.update.updateGame();
    this.client.update.updateBotList();
    this.client.setInterval(() => {
      this.client.update.updateGame();
      this.client.update.updateBotList();
    }, 30000);
  }
}

module.exports = ReadyEvent;
