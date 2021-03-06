const mtz = require('moment-timezone');
const Command = require('../../structures/Command');

class TimeforCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'timefor',
      aliases: ['tf'],
      category: 'misc',
      usage: '[user]',
      dm: true,
    });
  }

  async execute(context) {
    const search = context.args.join(' ');
    let user = context.message.author;
    if (search && context.message.guild) {
      const foundMembers = this.client.finder.findMembers(context.message.guild.members, search);
      if (!foundMembers || foundMembers.length === 0) return context.replyError(context.__('finderUtil.findMembers.zeroResult', { search }));
      if (foundMembers.length === 1) {
        user = foundMembers[0].user;
      } else if (foundMembers.length > 1) return context.replyWarning(this.client.finder.formatMembers(foundMembers, context.settings.misc.locale));
    }

    const userSettings = await this.client.database.getDocument('settings', user.id);
    if (!userSettings) {
      return context.replyWarning(context.__('timefor.noSettings', {
        name: `**${user.username}**#${user.discriminator}`,
        command: `${this.client.prefix}timezone`,
      }));
    }

    const time = mtz().tz(userSettings.misc.timezone);
    context.reply(context.__('timefor.title', {
      name: `**${user.username}**#${user.discriminator}`,
      time: `\`${time.format('HH:mm')}\` (\`${time.format('hh:mmA')}\`)`,
    }));
  }
}

module.exports = TimeforCommand;
