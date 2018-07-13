const Command = require('../../structures/Command');
const { RichEmbed } = require('discord.js');

class UserCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'user',
      aliases: ['userinfo', 'info'],
      category: 'general',
      usage: '[user]',
      dm: true,
    });
  }

  async execute(context) {
    const search = context.args.join(' ');
    let user = context.message.author;
    let member = context.message.member || null;
    if (search && context.message.guild) {
      const foundMembers = this.client.finder.findMembers(context.message.guild.members, search);
      if (!foundMembers || foundMembers.length === 0) return context.replyError(context.__('finderUtil.findMembers.zeroResult', { search }));
      if (foundMembers.length === 1) {
        member = foundMembers[0];
        user = foundMembers[0].user;
      } else if (foundMembers.length > 1) return context.replyWarning(this.client.finder.formatMembers(foundMembers, context.settings.misc.locale));
    }

    let presence = `${this.client.constants.status[user.presence.status]} **${context.__(`user.status.${user.presence.status}`)}**`;
    if (user.presence.game) {
      const gameType = user.presence.game.type;
      presence += ` (${context.__(`user.gameType.${gameType}`)} ${gameType === 1 ? `[${user.presence.game.name}](${user.presence.game.url})` : `*${user.presence.game.name}*`})`;
    }

    const badges = [];
    if (context.message.guild && context.message.guild.ownerID === user.id) badges.push(this.client.constants.badges.owner);
    if (this.client.config.owners.includes(user.id)) badges.push(this.client.constants.badges.botDev);
    if (user.avatar && user.avatar.startsWith('a_')) badges.push(this.client.constants.badges.nitro);
    await this.client.database.getDocument('donators', user.id).then(a => (a ? badges.push(this.client.constants.badges.donator) : undefined));

    const lastactive = await this.client.database.getDocument('lastactive', user.id)
      .then((lastactiveObject) => {
        if (!lastactiveObject) return context.__('global.noInformation');
        return this.client.time.timeSince(lastactiveObject.time, context.settings.misc.locale, false, true);
      });

    const userInformation = [`${this.dot} ${context.__('user.embed.id')}: **${user.id}**${badges.length > 0 ? ` ${badges.join(' ')}` : ''}`];
    if (context.message.guild) {
      userInformation.push(`${this.dot} ${context.__('user.embed.nickname')}: ${member.nickname ? `**${member.nickname}**` : context.__('global.none')}`);
    }

    userInformation.push(`${this.dot} ${context.__('user.embed.status')}: ${presence}`);

    if (context.message.guild) {
      userInformation.push(`${this.dot} ${context.__('user.embed.roles')}: ${member.roles.filter(r => r.id !== context.message.guild.id).sort((a, b) => b.position - a.position).map(r => r.toString()).join(', ') || context.__('global.none')}`);
    }

    userInformation.push(
      `${this.dot} ${context.__('user.embed.lastactive')}: ${lastactive}`,
      `${this.dot} ${context.__('user.embed.creation')}: **${context.formatDate(user.createdTimestamp)}**`,
    );

    if (context.message.guild) {
      const orderedMembers = context.message.guild.members
        .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
        .keyArray();
      let index = orderedMembers.findIndex(m => m === member.id) - 3;
      if (index < 0) index = 0;

      const joinOrder = [];
      const m1 = this.client.users.get(orderedMembers[index]);
      joinOrder.push(m1.id === member.id ? `**${m1.username}**` : m1.username);
      for (let i = (index + 2); i < (index + 6); i += 1) {
        if (i >= orderedMembers.length) break;
        const m2 = this.client.users.get(orderedMembers[i]);
        joinOrder.push(m2.id === member.id ? `**${m2.username}**` : m2.username);
      }

      userInformation.push(
        `${this.dot} ${context.__('user.embed.join')}: **${context.formatDate(member.joinedTimestamp)}**`,
        `${this.dot} ${context.__('user.embed.joinOrder')} (\`#${orderedMembers.findIndex(m => m === member.id) + 1}\`): ${joinOrder.join(' > ')}`,
      );
    }

    const embed = new RichEmbed()
      .setDescription(userInformation)
      .setThumbnail(user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}`
        : this.getDefaultAvatar(user.discriminator))
      .setColor(member && member.displayHexColor !== '#000000' ? member.displayHexColor : undefined);

    context.reply(
      context.__('user.title', {
        emote: (user.bot ? this.client.constants.emotes.botUser : this.client.constants.emotes.humanUser),
        name: `**${user.username}**#${user.discriminator}`,
      }),
      { embed },
    );
  }

  getDefaultAvatar(discriminator) {
    const defaultAvatarID = discriminator % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarID}.png`;
  }
}

module.exports = UserCommand;
