const Command = require('../../structures/Command');
const { RichEmbed } = require('discord.js');
const { deconstruct } = require('../../../node_modules/discord.js/src/util/Snowflake');
const snekfetch = require('snekfetch');

class LookupCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'lookup',
      category: 'general',
      usage: '<ID/invite>',
      dm: true,
    });
  }

  async execute(context) {
    const search = context.args.join(' ');
    if (!search) return context.replyError(context.__('lookup.noSearch'));
    const message = await context.replyLoading(context.__('global.loading'));
    const embed = new RichEmbed();
    let done = false;

    // User
    await this.client.fetchUser(search)
      .then(async (user) => {
        done = true;

        const badges = [];
        if (this.client.config.owners.includes(user.id)) badges.push(this.client.constants.badges.botDev);
        if (user.avatar && user.avatar.startsWith('a_')) badges.push(this.client.constants.badges.nitro);
        await this.client.database.getDocument('donators', user.id).then(a => (a ? badges.push(this.client.constants.badges.donator) : undefined));

        const lastactive = await this.client.database.getDocument('lastactive', user.id)
          .then((lastactiveObject) => {
            if (!lastactiveObject) return context.__('global.noInformation');
            return this.client.time.timeSince(lastactiveObject.time, context.settings.misc.locale, false, true);
          });

        const userInformation = [
          `${this.dot} ${context.__('user.embed.id')}: **${user.id}**${badges.length > 0 ? ` ${badges.join(' ')}` : ''}`,
          `${this.dot} ${context.__('user.embed.lastactive')}: ${lastactive}`,
          `${this.dot} ${context.__('user.embed.creation')}: **${context.formatDate(user.createdTimestamp)}**`,
        ].join('\n');

        embed
          .setDescription(userInformation)
          .setThumbnail(user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}`
            : this.getDefaultAvatar(user.discriminator));

        message.edit(
          context.__('user.title', {
            emote: (user.bot ? this.client.constants.emotes.botUser : this.client.constants.emotes.humanUser),
            name: `**${user.username}**#${user.discriminator}`,
          }),
          { embed },
        );
      })
      .catch(() => {
        done = false;
      });

    if (done) return;

    // Guild
    await snekfetch
      .get(`https://discordapp.com/api/guilds/${search}/widget.json`)
      .set({ 'User-Agent': this.client.constants.userAgent() })
      .then(async (res) => {
        done = true;

        const guildObject = res.body;
        const { timestamp } = deconstruct(guildObject.id);

        const inviteCode = this.client.resolver.resolveInviteCode(guildObject.instant_invite) || null;
        const metadata = await this.client.fetchInvite(guildObject.instant_invite)
          .then(i => ({
            icon: `https://cdn.discordapp.com/icons/${guildObject.id}/${i.guild.icon}`,
            memberCount: i.memberCount,
          }))
          .catch(() => ({}));

        const members = [
          `${this.client.constants.status.online} **${guildObject.members.filter(m => m.status === 'online').length}**`,
          `${this.client.constants.status.idle} **${guildObject.members.filter(m => m.status === 'idle').length}**`,
          `${this.client.constants.status.dnd} **${guildObject.members.filter(m => m.status === 'dnd').length}**`,
        ];

        if (metadata.memberCount) members.push(`${this.client.constants.status.offline} **${metadata.memberCount - guildObject.members.length}**`);

        const guildInformation = [
          `${this.dot} ${context.__('server.embed.id')}: **${guildObject.id}**`,
          `${this.dot} ${context.__('server.embed.members')}: ${members.join(' - ')}`,
          `${this.dot} ${context.__('server.embed.channels')}: **${guildObject.channels.length}** ${context.__('channel.type.voice')}`,
          `${this.dot} ${context.__('server.embed.invite')}: ${inviteCode ? `**[${inviteCode}](https://discord.gg/${inviteCode})**` : context.__('global.none')}`,
          `${this.dot} ${context.__('server.embed.creation')}: **${context.formatDate(timestamp)}**`,
        ].join('\n');

        embed
          .setDescription(guildInformation)
          .setThumbnail(metadata.icon);

        message.edit(
          context.__('server.title', { name: guildObject.name }),
          { embed },
        );
      })
      .catch((res) => {
        if (res.body && res.body.code === 50004) {
          done = true;
          message.edit(`${this.client.constants.emotes.warning} ${context.__('lookup.disabledWidget', { search })}`);
        } else {
          done = false;
        }
      });

    if (done) return;

    // Invite
    await this.client.rest.makeRequest('get', `/invites/${this.client.resolver.resolveInviteCode(search)}?with_counts=true`, true)
      .then(async (invite) => {
        done = true;

        const inviter = invite.inviter
          ? `**${invite.inviter.username}**#${invite.inviter.discriminator} (ID:${invite.inviter.id})`
          : context.__('global.none');

        const guildObject = await snekfetch
          .get(`https://discordapp.com/api/guilds/${invite.guild.id}/widget.json`)
          .set({ 'User-Agent': this.client.constants.userAgent() })
          .then(res => ({
            online: res.members.filter(m => m.status === 'online').length,
            idle: res.members.filter(m => m.status === 'idle').length,
            dnd: res.members.filter(m => m.status === 'dnd').length,
            offline: invite.approximate_member_count - res.members.length,
          }))
          .catch((r) => console.log('0:' + r.body));
        console.log('1:' + guildObject)

        const members = guildObject.online ? [
          `${this.client.constants.status.online} **${guildObject.online}**`,
          `${this.client.constants.status.idle} **${guildObject.idle}**`,
          `${this.client.constants.status.dnd} **${guildObject.dnd}**`,
          `${this.client.constants.status.offline} **${guildObject.offline}**`,
        ] : null;
        console.log('2:' + members)

        const inviteInformation = [
          `${this.dot} ${context.__('lookup.invite.embed.server')}: ${invite.guild ? `**${invite.guild.name}** (ID:${invite.guild.id})` : context.__('global.none')}${invite.guild.features.includes('VERIFIED') ? ` ${this.client.constants.emotes.verifiedServer}` : ''}`,
          `${this.dot} ${context.__('lookup.invite.embed.inviter')}: ${inviter}`,
          `${this.dot} ${context.__('lookup.invite.embed.channel')}: **${invite.channel.name ? `#${invite.channel.name}` : context.__('global.groupDm')}** (ID:${invite.channel.id})`,
          `${this.dot} ${context.__('lookup.invite.embed.members')}: ${members ? members.join(' - ') : `**${invite.approximate_member_count}**${invite.approximate_presence_count ? ` (${this.client.constants.status.online} **${invite.approximate_presence_count}**)` : ''}`}`,
          `${this.dot} ${context.__('lookup.invite.embed.quickAccess')}: **[${invite.code}](https://discord.gg/${invite.code})**`,
        ].join('\n');

        embed.setDescription(inviteInformation);
        if (invite.guild) {
          if (invite.guild.icon) embed.setThumbnail(`https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.png`);
          if (invite.guild.splash) embed.setImage(`https://cdn.discordapp.com/splashes/${invite.guild.id}/${invite.guild.splash}.png?size=512`);
        }

        message.edit(
          context.__('lookup.invite.title', { invite: invite.code }),
          { embed },
        );
      })
      .catch((e) => {
        done = false;
      });

    if (!done) {
      message.edit(`${this.client.constants.emotes.error} ${context.__('lookup.nothingFound', { search })}`);
    }
  }

  getDefaultAvatar(discriminator) {
    const defaultAvatarID = discriminator % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarID}.png`;
  }
}

module.exports = LookupCommand;
