const Command = require('../../structures/Command');
const { RichEmbed } = require('discord.js');

class TelephoneCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'telephone',
      aliases: ['phone'],
      children: [
        new SubscribeSubcommand(client),
        new TerminateSubcommand(client),
        new PhonebookSubcommand(client),
        new SwitchSubcommand(client),
      ],
      category: 'telephone',
      dm: true,
    });
  }

  async execute(context) {
    const subscription = await this.client.database.getDocument('telephone', context.message.channel.id);
    if (!subscription) {
      return context.replyWarning(context.__('telephone.noSubscription', { command: `${this.client.prefix}telephone subscribe` }));
    }

    const subscriber = await this.client.fetchUser(subscription.subscriber)
      .then(u => `**${u.username}**#${u.discriminator}`)
      .catch(() => null);

    const subscriptionInformation = [
      `${this.dot} ${context.__('telephone.embed.number')}: **${subscription.number}**`,
      `${this.dot} ${context.__('telephone.embed.subscriber')}: ${subscriber || `*${context.__('global.unknown')}*`}`,
      `${this.dot} ${context.__('telephone.embed.phonebook')}: ${subscription.phonebook ? `**${context.__('global.yes')}** (${subscription.phonebook})` : `**${context.__('global.no')}**`}`,
      `${this.dot} ${context.__('telephone.embed.date')}: **${context.formatDate(subscription.time)}**`,
    ].join('\n');

    const embed = new RichEmbed()
      .setDescription(subscriptionInformation);
    
    context.reply(
      context.__('telephone.title', { name: context.message.guild ? `**#${context.message.channel.name}**` : `**${context.__('global.dm')}**` }),
      { embed },
    );
  }
}

class SubscribeSubcommand extends Command {
  constructor(client) {
    super(client, {
      name: 'subscribe',
      aliases: ['setup'],
      userPermissions: ['MANAGE_GUILD'],
      botPermissions: ['ADD_REACTIONS'],
      usage: '[message]',
      category: 'telephone',
      dm: true,
    });
  }

  async execute(context) {
    const subscription = await this.client.database.getDocument('telephone', context.message.channel.id);
    if (subscription) return context.replyWarning(context.__('telephone.setup.subscriptionExist', { command: `${this.client.prefix}telephone terminate` }));

    const msg = context.args.join(' ');
    if (msg && msg.length > 64) return context.replyWarning(context.__('telephone.phonebook.messageTooLong'));

    const time = Date.now();
    const number = this.client.other.generateNumber(context.message.channel.id);
    const setupInformation = [
      `${this.dot} ${context.__('telephone.embed.number')}: **${number}**`,
      `${this.dot} ${context.__('telephone.embed.subscriber')}: **${context.message.author.username}**#${context.message.author.discriminator}`,
      `${this.dot} ${context.__('telephone.embed.phonebook')}: ${msg ? `**${context.__('global.yes')}** (${msg})` : `**${context.__('global.no')}**`}`,
      `${this.dot} ${context.__('telephone.embed.date')}: **${context.formatDate(time)}**`,
      '',
      `${this.dot} ${context.__('telephone.setup.confirmation', { success: this.client.constants.emotes.success, error: this.client.constants.emotes.error })}`,
    ].join('\n');

    const embed = new RichEmbed()
      .setDescription(setupInformation);

    const message = await context.reply(
      context.__('telephone.setup.title', { name: context.message.guild ? `**#${context.message.channel.name}**` : `**${context.__('global.dm')}**` }),
      { embed },
    );

    await message.react(this.client.constants.emotes.successID);
    await message.react(this.client.constants.emotes.errorID);

    message.awaitReactions(
      (reaction, user) => [this.client.constants.emotes.successID, this.client.constants.emotes.errorID].includes(reaction.emoji.identifier) && user.id === context.message.author.id,
      { max: 1 },
    )
      .then(async (reactions) => {
        const emoji = reactions.first().emoji.identifier;

        if (emoji === this.client.constants.emotes.successID) {
          await this.client.database.insertDocument(
            'telephone',
            {
              id: context.message.channel.id,
              settings: context.message.guild ? context.message.guild.id : context.message.author.id,
              number,
              subscriber: context.message.author.id,
              phonebook: msg || false,
              blacklist: [],
              contacts: [],
              message: {
                incoming: false,
                missed: false,
              },
              time,
            },
            {
              conflict: 'update',
            },
          );

          message.edit(`${this.client.constants.emotes.success} ${context.__('telephone.setup.done')}`);
          message.clearReactions();
        } else {
          message.edit(`${this.client.constants.emotes.success} ${context.__('telephone.setup.cancelled')}`);
          message.clearReactions();
        }
      });
  }
}

class TerminateSubcommand extends Command {
  constructor(client) {
    super(client, {
      name: 'terminate',
      userPermissions: ['MANAGE_GUILD'],
      botPermissions: ['ADD_REACTIONS'],
      category: 'telephone',
      dm: true,
    });
  }

  async execute(context) {
    const subscription = await this.client.database.getDocument('telephone', context.message.channel.id);
    if (!subscription) return context.replyWarning(context.__('telephone.noSubscription', { command: `${this.client.prefix}telephone subscribe` }));

    const subscriber = await this.client.fetchUser(subscription.subscriber)
      .then(u => `**${u.username}**#${u.discriminator}`)
      .catch(() => null);

    const terminateInformation = [
      `${this.dot} ${context.__('telephone.embed.number')}: **${subscription.number}**`,
      `${this.dot} ${context.__('telephone.embed.subscriber')}: ${subscriber || `*${context.__('global.unknown')}*`}`,
      `${this.dot} ${context.__('telephone.embed.date')}: **${context.formatDate(subscription.time)}**`,
      '',
      `${this.dot} ${context.__('telephone.terminate.confirmation', { success: this.client.constants.emotes.success, error: this.client.constants.emotes.error })}`,
    ].join('\n');

    const embed = new RichEmbed()
      .setDescription(terminateInformation);

    const message = await context.reply(
      context.__('telephone.terminate.title', { name: context.message.guild ? `**#${context.message.channel.name}**` : `**${context.__('global.dm')}**` }),
      { embed },
    );

    await message.react(this.client.constants.emotes.successID);
    await message.react(this.client.constants.emotes.errorID);

    message.awaitReactions(
      (reaction, user) => [this.client.constants.emotes.successID, this.client.constants.emotes.errorID].includes(reaction.emoji.identifier) && user.id === context.message.author.id,
      { max: 1 },
    )
      .then(async (reactions) => {
        const emoji = reactions.first().emoji.identifier;

        if (emoji === this.client.constants.emotes.successID) {
          await this.client.database.deleteDocument('telephone', context.message.channel.id);

          message.edit(`${this.client.constants.emotes.success} ${context.__('telephone.terminate.done')}`);
          message.clearReactions();
        } else {
          message.edit(`${this.client.constants.emotes.success} ${context.__('telephone.terminate.cancelled')}`);
          message.clearReactions();
        }
      });
  }
}

class PhonebookSubcommand extends Command {
  constructor(client) {
    super(client, {
      name: 'phonebook',
      userPermissions: ['MANAGE_GUILD'],
      category: 'telephone',
      usage: '<message|off>',
      dm: true,
    });
  }

  async execute(context) {
    const message = context.args.join(' ');
    if (!message) return context.replyError(context.__('telephone.phonebook.noMessage'));
    if (message.length > 64) return context.replyWarning(context.__('telephone.phonebook.messageTooLong'));

    const subscription = await this.client.database.getDocument('telephone', context.message.channel.id);

    if (message.toLowerCase() === 'off') {
      if (!subscription.phonebook) return context.replyWarning(context.__('telephone.phonebook.alreadyDisabled'));
      await this.client.database.updateDocument('telephone', context.message.channel.id, { phonebook: false });
      context.replySuccess(context.__('telephone.phonebook.disabled'));
    } else {
      await this.client.database.updateDocument('telephone', context.message.channel.id, { phonebook: message });
      context.replySuccess(context.__('telephone.phonebook.enabled'));
    }
  }
}

class SwitchSubcommand extends Command {
  constructor(client) {
    super(client, {
      name: 'switch',
      category: 'telephone',
      private: true,
      dm: true,
    });
  }

  async execute(context) {
    const current = await this.client.database.getDocument('bot', 'settings').then(s => s.telephone);
    if (current) {
      await this.client.database.updateDocument('bot', 'settings', { telephone: false });
      context.replySuccess('The telephone service has been successfully **disabled**!');
    } else {
      await this.client.database.updateDocument('bot', 'settings', { telephone: true });
      context.replySuccess('The telephone service has been successfully **enabled**!');
    }
  }
}

class ImportSubcommand extends Command {
  constructor(client) {
    super(client, {
      name: 'import',
      category: 'telephone',
    });
  }

  async execute(context) {
    const oldSubscription = await this.client.database.provider.db('homer').table('guild').get(context.message.guild.id).run()
    if (!oldSubscription || !oldSubscription.phone.number) return context.replyWarning(context.__('telephone.import.noNumber'));


    const subscription = {
      id: context.message.channel.id,
      settings: context.message.guild.id,
      number: oldSubscription.phone.number,
      subscriber: context.message.author.id,
      phonebook: oldSubscription.phone.phonebook ? context.message.guild.name : false,
      blacklist: [],
      contacts: [],
      message: {
        incoming: oldSubscription.phone.incomingMessage || false,
        missed: oldSubscription.phone.missedMessage || false,
      },
      time: Date.now(),
    };

    const terminateInformation = [
      `${this.dot} ${context.__('telephone.embed.number')}: **${subscription.number}**`,
      `${this.dot} ${context.__('telephone.embed.subscriber')}: ${subscriber || `*${context.__('global.unknown')}*`}`,
      `${this.dot} ${context.__('telephone.embed.date')}: **${context.formatDate(subscription.time)}**`,
      '',
      `${this.dot} ${context.__('telephone.terminate.confirmation', { success: this.client.constants.emotes.success, error: this.client.constants.emotes.error })}`,
    ].join('\n');

    const embed = new RichEmbed()
      .setDescription(terminateInformation);

    const message = await context.reply(
      context.__('telephone.terminate.title', { name: context.message.guild ? `**#${context.message.channel.name}**` : `**${context.__('global.dm')}**` }),
      { embed },
    );

    await message.react(this.client.constants.emotes.successID);
    await message.react(this.client.constants.emotes.errorID);

    message.awaitReactions(
      (reaction, user) => [this.client.constants.emotes.successID, this.client.constants.emotes.errorID].includes(reaction.emoji.identifier) && user.id === context.message.author.id,
      { max: 1 },
    )
      .then(async (reactions) => {
        const emoji = reactions.first().emoji.identifier;

        if (emoji === this.client.constants.emotes.successID) {
          await this.client.database.deleteDocument('telephone', context.message.channel.id);

          message.edit(`${this.client.constants.emotes.success} ${context.__('telephone.terminate.done')}`);
          message.clearReactions();
        } else {
          message.edit(`${this.client.constants.emotes.success} ${context.__('telephone.terminate.cancelled')}`);
          message.clearReactions();
        }
      });
  }
}

module.exports = TelephoneCommand;
