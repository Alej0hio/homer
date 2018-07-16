const Command = require('../../structures/Command');
const Menu = require('../../structures/Menu');
const { RichEmbed, Permissions } = require('discord.js');

class RoleCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'role',
      category: 'general',
      children: [new MembersSubcommand(client)],
      usage: '<role>',
    });
  }

  async execute(context) {
    const search = context.args.join(' ');
    let role = null;
    if (search) {
      const foundRoles = this.client.finder.findRolesOrChannels(context.message.guild.roles, search);
      if (!foundRoles || foundRoles.length === 0) return context.replyError(context.__('finderUtil.findRoles.zeroResult', { search }));
      if (foundRoles.length === 1) role = foundRoles[0];
      else if (foundRoles.length > 1) return context.replyWarning(this.client.finder.formatRoles(foundRoles, context.settings.misc.locale));
    } else {
      return context.replyError(context.__('role.noQuery'));
    }

    const permissions = new Permissions(role.permissions).serialize();
    const permissionsString = Object.keys(permissions)
      .filter(p => permissions[p])
      .map(p => `\`${p}\``)
      .join(', ') || context.__('global.none');

    const roleInformation = [
      `${this.dot} ${context.__('role.embed.id')}: **${role.id}**`,
      `${this.dot} ${context.__('role.embed.color')}: **${role.hexColor.toUpperCase()}**`,
      `${this.dot} ${context.__('role.embed.position')}: #**${context.message.guild.roles.sort((a, b) => b.position - a.position).array().findIndex(r => r.id === role.id) + 1}**`,
      `${this.dot} ${context.__('role.embed.managed')}: **${context.__(`global.${role.managed ? 'yes' : 'no'}`)}**`,
      `${this.dot} ${context.__('role.embed.mentionable')}: **${context.__(`global.${role.mentionable ? 'yes' : 'no'}`)}**`,
      `${this.dot} ${context.__('role.embed.members')}: **${role.members.size}**`,
      `${this.dot} ${context.__('role.embed.hoisted')}: **${context.__(`global.${role.hoisted ? 'yes' : 'no'}`)}**`,
      `${this.dot} ${context.__('role.embed.permissions')}: ${permissionsString}`,
      `${this.dot} ${context.__('role.embed.creation')}: **${context.formatDate(role.createdTimestamp)}**`,
    ];

    const embed = new RichEmbed()
      .setDescription(roleInformation)
      .setColor(role.hexColor === '#000000' ? undefined : role.hexColor)
      .setFooter(context.__('role.embed.footer', { command: `${this.client.prefix}role members ${role.name}` }));

    context.reply(
      context.__('role.title', {
        name: role.name,
      }),
      { embed },
    );
  }
}

class GiveSubcommand extends Command {
  constructor(client) {
    super(client, {
      name: 'give',
      category: 'general',
      userPermissions: ['MANAGE_ROLES'],
      botPermissions: ['MANAGE_ROLES'],
    });
  }

  async execute(context) {
    const [roleSearch, userSearch] = context.args.join(' ').split(' to ');
    if (!roleSearch || !userSearch) return context.replyError(context.__('role.give.missingParameters'));

    let role = null;
    if (roleSearch) {
      const foundRoles = this.client.finder.findRolesOrChannels(context.message.guild.roles, roleSearch);
      if (!foundRoles || foundRoles.length === 0) return context.replyError(context.__('finderUtil.findRoles.zeroResult', { search: roleSearch }));
      if (foundRoles.length === 1) role = foundRoles[0];
      else if (foundRoles.length > 1) return context.replyWarning(this.client.finder.formatRoles(foundRoles, context.settings.misc.locale));
    } else {
      return context.replyError(context.__('role.noQuery'));
    }

    let member = null;
    if (userSearch) {
      const foundMembers = this.client.finder.findMembers(context.message.guild.members, userSearch);
      if (!foundMembers || foundMembers.length === 0) return context.replyError(context.__('finderUtil.findMembers.zeroResult', { search: userSearch }));
      if (foundMembers.length === 1) member = foundMembers[0];
      else if (foundMembers.length > 1) return context.replyWarning(this.client.finder.formatMembers(foundMembers, context.settings.misc.locale));
    } else {
      return context.replyError(context.__('roleme.give.noUserQuery'));
    }

    if (member.roles.has(role.id)) {
      return context.replyError(context.__('roleme.give.alreadyHave', { name: role.name }));
    }

    await member.addRole(role.id, `${this.client.prefix}role give`);
    context.replySuccess(context.__('roleme.give.roleGiven', { name: role.name }));
  }
}

class MembersSubcommand extends Command {
  constructor(client) {
    super(client, {
      name: 'members',
      category: 'general',
      usage: '<role>',
    });
  }

  async execute(context) {
    const search = context.args.join(' ');
    let role = null;
    if (search) {
      const foundRoles = this.client.finder.findRolesOrChannels(context.message.guild.roles, search);
      if (!foundRoles || foundRoles.length === 0) return context.replyError(context.__('finderUtil.findRoles.zeroResult', { search }));
      if (foundRoles.length === 1) role = foundRoles[0];
      else if (foundRoles.length > 1) return context.replyWarning(this.client.finder.formatRoles(foundRoles, context.settings.misc.locale));
    } else {
      return context.replyError(context.__('role.noQuery'));
    }

    if (role.members.size === 0) return context.replyWarning(context.__('role.members.noMembers', { role: role.name }));

    const m = [];
    for (const member of role.members.keyArray()) {
      const u = await this.client.fetchUser(member);
      m.push(`${this.dot} **${u.username}#${u.discriminator} (ID:${u.id})`);
    }

    const menu = new Menu(
      context,
      m,
    );

    menu.send(context.__('role.members.title', { role: role.name }));
  }
}

module.exports = RoleCommand;
