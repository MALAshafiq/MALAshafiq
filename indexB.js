const { Client, GatewayIntentBits, PermissionsBitField, REST, Routes, MessageEmbed } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

const creditsFile = 'database.json';

let data = {};

// Load credits from database.json
if (fs.existsSync(creditsFile)) {
  data = JSON.parse(fs.readFileSync(creditsFile));
} else {
  data = { credits: {}, lastDaily: {} };
}

// Save credits to database.json
function saveData() {
  fs.writeFileSync(creditsFile, JSON.stringify(data, null, 2));
}

// Add credits to a user
function addCredits(userId, amount) {
  if (!data.credits[userId]) {
    data.credits[userId] = 0;
  }
  data.credits[userId] += amount;
  saveData();
}

// Get credits of a user
function getCredits(userId) {
  return data.credits[userId] || 0;
}

// Check if the user can claim daily credits
function canClaimDaily(userId) {
  const now = Date.now();
  const lastClaim = data.lastDaily[userId] || 0;
  const oneDay = 11 * 60 * 60 * 1000; // 24 hours in milliseconds

  return now - lastClaim >= oneDay;
}

// Set the last daily claim time for a user
function setLastDaily(userId) {
  data.lastDaily[userId] = Date.now();
  saveData();
}

// Slash command registration
const commands = [
  {
    name: 'kick',
    description: 'Kick a user',
    options: [{
      name: 'user',
      type: 6, // USER
      description: 'The user to kick',
      required: true,
    }],
  },
  {
    name: 'ban',
    description: 'Ban a user',
    options: [{
      name: 'user',
      type: 6, // USER
      description: 'The user to ban',
      required: true,
    }],
  },
  {
    name: 'timeout',
    description: 'Timeout a user',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'The user to timeout',
        required: true,
      },
      {
        name: 'duration',
        type: 4, // INTEGER
        description: 'Duration in minutes',
        required: true,
      }
    ],
  },
  {
    name: 'unban',
    description: 'Unban a user by ID',
    options: [{
      name: 'userid',
      type: 3, // STRING
      description: 'The user ID to unban',
      required: true,
    }],
  },
  {
    name: 'untimeout',
    description: 'Remove timeout from a user',
    options: [{
      name: 'user',
      type: 6, // USER
      description: 'The user to remove from timeout',
      required: true,
    }],
  },
  {
    name: 'mute',
    description: 'Mute a user in voice channel',
    options: [{
      name: 'user',
      type: 6, // USER
      description: 'The user to mute',
      required: true,
    }],
  },
  {
    name: 'unmute',
    description: 'Unmute a user in voice channel',
    options: [{
      name: 'user',
      type: 6, // USER
      description: 'The user to unmute',
      required: true,
    }],
  },
  {
    name: 'defend',
    description: 'Deafen a user in voice channel',
    options: [{
      name: 'user',
      type: 6, // USER
      description: 'The user to deafen',
      required: true,
    }],
  },
  {
    name: 'undefend',
    description: 'Undeafen a user in voice channel',
    options: [{
      name: 'user',
      type: 6, // USER
      description: 'The user to undeafen',
      required: true,
    }],
  },
  {
    name: 'moveall',
    description: 'Move all users to specified voice channel',
    options: [{
      name: 'channel',
      type: 7, // CHANNEL
      description: 'The voice channel to move users to',
      required: true,
    }],
  },
  {
    name: 'clear',
    description: 'Clear specified number of messages',
    options: [{
      name: 'amount',
      type: 4, // INTEGER
      description: 'Number of messages to delete',
      required: true,
    }],
  },
  {
    name: 'avatar',
    description: 'Display your or someone else\'s avatar',
    options: [{
      name: 'user',
      type: 6, // USER
      description: 'The user to display avatar of',
      required: false,
    }],
  },
  {
    name: 'help',
    description: 'Display the help message',
  },
  {
    name: 'myid',
    description: 'Display your Discord ID',
  },
  {
    name: 'credits',
    description: 'Show your credits',
  },
  {
    name: 'daily',
    description: 'Claim your daily credits',
  },
  {
    name: 'send',
    description: 'Send credits to another user',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'The user to send credits to',
        required: true,
      },
      {
        name: 'amount',
        type: 4, // INTEGER
        description: 'The amount of credits to send',
        required: true,
      }
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
  console.log('Bot is online!');
    
  let textList = ["/help", "I'M YOUR HOPE, YOU'RE MY HOPE, I'M J-HOPE-J"];
  client.user.setPresence({ activities: [{ name: "/help" }], status: 'idle' });

  setInterval(() => {
    let text = textList[Math.floor(Math.random() * textList.length)];
    client.user.setPresence({ activities: [{ name: text }], status: 'idle' });
  }, 30000);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  const userId = interaction.user.id;

  if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    if (commandName === 'kick') {
      const member = options.getMember('user');
      if (member) {
        await member.kick().catch(console.error);
        await interaction.reply(`**🚪〢${member.user.tag} was kicked.**`);
      } else {
        await interaction.reply('**❌〢Please mention a user to kick.**');
      }
    } else if (commandName === 'ban') {
      const member = options.getMember('user');
      if (member) {
        await member.ban().catch(console.error);
        await interaction.reply(`**🚫〢${member.user.tag} was banned.**`);
      } else {
        await interaction.reply('**❌〢Please mention a user to ban.**');
      }
    } else if (commandName === 'timeout') {
      const member = options.getMember('user');
      const duration = options.getInteger('duration');
      if (member && duration) {
        await member.timeout(duration * 1000 * 60).catch(console.error); // duration in minutes
        await interaction.reply(`**⏳〢${member.user.tag} was timed out for ${duration} minutes.**`);
      } else {
        await interaction.reply('**❌〢Please mention a user and specify the duration in minutes.**');
      }
    } else if (commandName === 'unban') {
      const userId = options.getString('userid');
      if (userId) {
        await interaction.guild.members.unban(userId).catch(console.error);
        await interaction.reply(`**✅〢User with ID ${userId} was unbanned.**`);
      } else {
        await interaction.reply('**❌〢Please provide a user ID to unban.**');
      }
    } else if (commandName === 'untimeout') {
      const member = options.getMember('user');
      if (member) {
        await member.timeout(null).catch(console.error);
        await interaction.reply(`**✅〢${member.user.tag} was removed from timeout.**`);
      } else {
        await interaction.reply('**❌〢Please mention a user to remove from timeout.**');
      }
    } else if (commandName === 'mute') {
      const member = options.getMember('user');
      if (member) {
        await member.voice.setMute(true).catch(console.error);
        await interaction.reply(`**🔇〢${member.user.tag} was muted.**`);
      } else {
                await interaction.reply('**❌〢Please mention a user to mute.**');
      }
    } else if (commandName === 'unmute') {
      const member = options.getMember('user');
      if (member) {
        await member.voice.setMute(false).catch(console.error);
        await interaction.reply(`**🔊〢${member.user.tag} was unmuted.**`);
      } else {
        await interaction.reply('**❌〢Please mention a user to unmute.**');
      }
    } else if (commandName === 'defend') {
      const member = options.getMember('user');
      if (member) {
        await member.voice.setDeaf(true).catch(console.error);
        await interaction.reply(`**🔕〢${member.user.tag} was deafened.**`);
      } else {
        await interaction.reply('**❌〢Please mention a user to deafen.**');
      }
    } else if (commandName === 'undefend') {
      const member = options.getMember('user');
      if (member) {
        await member.voice.setDeaf(false).catch(console.error);
        await interaction.reply(`**🔊〢${member.user.tag} was undeafened.**`);
      } else {
        await interaction.reply('**❌〢Please mention a user to undeafen.**');
      }
    } else if (commandName === 'moveall') {
      const voiceChannel = options.getChannel('channel');
      if (voiceChannel && voiceChannel.isVoice()) {
        const members = interaction.guild.members.cache.filter(member => member.voice.channel);
        members.forEach(member => member.voice.setChannel(voiceChannel).catch(console.error));
        await interaction.reply('**🚶‍♂️〢Moved all members to the specified voice channel.**');
      } else {
        await interaction.reply('**❌〢Please provide a valid voice channel.**');
      }
    } else if (commandName === 'clear') {
      const amount = options.getInteger('amount');
      if (!isNaN(amount) && amount > 0) {
        await interaction.channel.bulkDelete(amount, true).catch(console.error);
        await interaction.reply(`**🗑️〢Deleted ${amount} messages.**`);
      } else {
        await interaction.reply('**❌〢Please provide a valid number of messages to delete.**');
      }
    }
  }

  // Public commands
  if (commandName === 'avatar') {
    const user = options.getUser('user') || interaction.user;
    await interaction.reply(user.displayAvatarURL({ dynamic: true }));
  } else if (commandName === 'help') {
    const helpMessage = `
**Administrator Commands:<a:emoji_40:1270170419734773801>**
\`/kick user:@user\` - **Kick a user.** <:emoji_4:1270169489417306113>
\`/ban user:@user\` - **Ban a user.** <a:emoji_3:1270169433163436093>
\`/timeout user:@user duration:<minutes>\` - **Timeout a user for specified minutes.** <a:emoji_16:1270169796851269672>
\`/unban userid:<user_id>\` - **Unban a user by ID.** ✅
\`/untimeout user:@user\` - **Remove timeout from a user.** ✅
\`/mute user:@user\` - **Mute a user in voice channel.** <:emoji_29:1270170177593540619>
\`/unmute user:@user\` - **Unmute a user in voice channel.** 🔊
\`/defend user:@user\` - **Deafen a user in voice channel.** 🔕
\`/undefend user:@user\` - **Undeafen a user in voice channel.** <:emoji_30:1270170208593510410>
\`/moveall channel:<voice_channel>\` - **Move all users to specified voice channel.** 🚶‍♂️
\`/clear amount:<number>\` - **Clear specified number of messages.** 🗑️

**Public Commands:<a:emoji_40:1270170419734773801>**
\`/avatar [user:@user]\` - **Display your or someone else's avatar.<a:emoji_19:1270169898605346946>**
\`/help\` - **Display this help message.<:emoji_2:1270169410136707113>**
\`/myid\` - **Display your Discord ID.<:emoji_50:1270170628510716005>**
\`/credits - Joj-joj\` - **Show your credits.** <:emoji_1:1270169368856232060>
\`/daily\` - **Claim your daily credits.** <a:emoji_34:1270170295491104798>
\`/send user:@user amount:<number>\` - **Send credits to another user.** <a:emoji_34:1270170295491104798>
    `;
    await interaction.reply(helpMessage);
  } else if (commandName === 'myid') {
    await interaction.reply(`**<:emoji_38:1270170400566939720>〢Your ID is ${interaction.user.id}**`);
  } else if (commandName === 'credits') {
    const userCredits = getCredits(userId);
    await interaction.reply(`**<:emoji_1:1270169368856232060>〢${interaction.user.username}, you have ${userCredits} credits.**`);
  } else if (commandName === 'daily') {
    if (canClaimDaily(userId)) {
      addCredits(userId, 1750);
      setLastDaily(userId);
      await interaction.reply(`**<a:emoji_34:1270170295491104798>〢${interaction.user.username}, you received your daily 1750 credits!**`);
    } else {
      const lastClaim = new Date(data.lastDaily[userId]);
      await interaction.reply(`**❌〢${interaction.user.username}, you can claim daily credits again after ${lastClaim.toLocaleString()}.**`);
    }
  } else if (commandName === 'send') {
    const recipient = options.getUser('user');
    const amount = options.getInteger('amount');
    if (recipient && amount > 0) {
      const recipientId = recipient.id;
      if (getCredits(userId) >= amount) {
        addCredits(userId, -amount);
        addCredits(recipientId, amount);
        await interaction.reply(`**<a:emoji_9:1270169615217197198>〢${interaction.user.username} sent ${amount} credits to ${recipient.username}.**`);
        
        // Send DM to the recipient
        try {
          await recipient.send(`**<a:emoji_34:1270170295491104798>〢You received ${amount} credits from ${interaction.user.username} (${userId}). Do you happy with that?**`);
        } catch (error) {
          console.error('Could not send DM to the user:', error);
        }
      } else {
        await interaction.reply('**❌〢You do not have enough credits to send.**');
      }
    } else {
      await interaction.reply('**❌〢Please mention a user and specify the amount of credits to send.**');
    }
  }
});
client.on('messageCreate', async message => {
  if (message.content.toLowerCase() === 'joj' || message.content.toLowerCase() === 'joj') {
    const userId = message.author.id;
    const userCredits = getCredits(userId);
    await message.reply(`**<:emoji_1:1270169368856232060>〢${message.author.username}, you have ${userCredits} credits.**`);
  }
});

client.login(config.token);