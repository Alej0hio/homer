const Event = require('../structures/Event');
const { RichEmbed } = require('discord.js');

class MessageEvent extends Event {
  constructor(client) {
    super(client, 'message');
  }

  async handle(message) {
    // Command handling
    this.client.commands.handleCommand(message);

    // Set last active
    this.client.database.insertDocument(
      'lastactive',
      {
        id: message.author.id,
        time: Date.now(),
      },
      {
        conflict: 'update',
      },
    );

    // Remove AFK
    this.client.database.getDocument('afk', message.author.id)
      .then(async (afkObject) => {
        if (!afkObject) return;

        const userSettings = await this.client.database.getDocument('settings', message.author.id) || this.client.constants.defaultUserSettings(message.author.id);
        this.client.database.deleteDocument('afk', message.author.id);
        message.author.send(this.client.__(userSettings.misc.locale, 'afk.removeMessage'));
      });

    // AFK notification
    const mentions = message.mentions.members.keyArray();
    if (message.guild && !message.author.bot && mentions.length > 0) {
      const guildSettings = await this.client.database.getDocument('settings', message.guild.id) || this.client.constants.defaultGuildSettings(message.guild.id);
      const msg = [];
      for (const id of mentions) {
        const user = await this.client.fetchUser(id);
        if (!user) continue;

        const afk = await this.client.database.getDocument('afk', user.id);
        if (!afk) continue;

        msg.push(`${this.client.constants.emotes.dot} **${user.username}**#${user.discriminator}: ${afk.message || this.client.__(guildSettings.misc.locale, 'global.noReason')} • ${this.client.time.timeSince(afk.time, guildSettings.misc.locale, true, true)}`);
      }

      if (msg.length > 0) {
        const embed = new RichEmbed().setDescription(msg.join('\n'));
        message.channel.send(`${this.client.constants.emotes.warning} ${this.client.__(guildSettings.misc.locale, 'afk.messageHandler')}`, { embed });
      }
    }

    // Handle phone call
    const blacklist = await this.client.database.getDocument('blacklist', message.author.id);
    if ((!message.author.bot || this.client.config.botWhitelist.includes(message.author.id)) && !blacklist) {
      this.client.database.getDocuments('calls')
        .then(async (calls) => {
          const callObject = calls.find(c => [c.sender.id, c.receiver.id].includes(message.channel.id) && c.state === 1);
          if (!callObject) return;

          const target = (message.channel.id === callObject.sender.id) ? callObject.receiver.id : callObject.sender.id;
          const targetSettings = (message.channel.id === callObject.sender.id) ? callObject.receiver.settings : callObject.sender.settings;
          if (targetSettings.ignored && targetSettings.ignored.find(i => i.id === message.author.id)) return;

          const msg = [`📞 **${message.author.username}**#${message.author.discriminator}: ${message.cleanContent}`];
          const toLanguage = (await this.client.database.getDocument('settings', targetSettings) || this.client.constants.defaultUserSettings(targetSettings)).misc.locale;
          if (message.attachments.size > 0) msg.push('', this.client.__(toLanguage, 'telephone.attachments'));
          message.attachments.forEach((attachment) => {
            msg.push(`- **${attachment.filename}**: <${attachment.url}>`);
          });

          this.client.sendMessage(target, msg.join('\n'));
        });
    }
  }
}

module.exports = MessageEvent;
