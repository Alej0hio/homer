const mtz = require('moment-timezone');
const Event = require('../structures/Event');

class DisconnectEvent extends Event {
  constructor(client) {
    super(client, 'disconnect');
  }

  async handle() {
    this.client.ready = false;

    // Sending message in logChannel
    this.client.sendMessage(this.client.config.logChannel, `\`[${mtz().format('HH:mm:ss')}]\` 📡 Shard ID **${this.client.shard.id}** is now **OFFLINE**.`);
    this.client.updateMessage(this.client.config.statusChannel, this.client.config.status[`shard_${this.client.shard.id}`], `◻ Shard ${this.client.shard.id}: **${this.client.constants.status.offline} Offline**`);
  }
}

module.exports = DisconnectEvent;
