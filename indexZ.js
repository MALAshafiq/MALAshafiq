const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, Collection, REST, Routes, PermissionsBitField, SlashCommandBuilder } = require('discord.js');
const { Manager } = require('erela.js');
const fs = require('fs');
const token = 'MTI1MTg4ODAzOTk0MTM3NDA4NA.G_O0h1.sUVFjuEONYXcdzwCiXvo0vpWizNoAiIL_AWHqM';
const clientId = '1251888039941374084';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
});

// Load existing playlists from file or initialize an empty object
let playlists = JSON.parse(fs.readFileSync('playlists.json', 'utf-8') || '{}');

client.once('ready', () => {
    const guilds = client.guilds.cache.size;
    const members = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Guilds: ${guilds}`);
    console.log(`Members: ${members}`);
    client.user.setPresence({
        activities: [{ name: '/help or +help' }],
        status: 'online',
    });
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Optionally, log the error or notify administrators
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Optionally, log the error or notify administrators
});

const manager = new Manager({
    nodes: [
        {
            host: 'lava-v3.ajieblogs.eu.org', // Lavalink host

            port: 80, // Lavalink port

            password: 'https://dsc.gg/ajidevserver', // Lavalink password

            secure: false,
        },
    ],
    send(id, payload) {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    },
});

const filtersInfo = [
  { name: 'Bass Boost', description: 'Enhances the bass frequencies in audio, providing a deeper and more pronounced bass sound.' },
  { name: 'Nightcore', description: 'Increases the speed and pitch of the audio, typically giving songs a higher-energy and upbeat feel.' },
  { name: 'Vaporwave', description: 'Slows down the audio speed while also reducing pitch, often combined with effects like reverb and distortion for a nostalgic, retro vibe.' },
  { name: 'Karaoke', description: 'Adjusts the audio to reduce the vocal frequencies, making it easier to sing along or use as background music for karaoke sessions.' },
  { name: 'Tremolo', description: 'Modulates the amplitude of the audio signal at a specific frequency, creating a trembling effect that adds texture and depth to the sound.' },
  { name: 'Vibrato', description: 'Modulates the pitch of the audio signal at a specific frequency, producing a slight variation in pitch to enrich the sound.' },
  { name: 'Reset Filters', description: 'Removes all applied filters, returning the audio to its original state.' }
];
const commands = [
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display available commands & information'),
        new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Loops the current track for a specified number of times.')
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of times to loop the current track')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('filters')
        .setDescription('Display available filters & information'),
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song in your current voice channel')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The song name or URL to play')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Manage playlists')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The name of the playlist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an existing playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The name of the playlist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The name of the playlist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('import')
                .setDescription('Import a playlist from a link')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The name of the playlist')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('link')
                        .setDescription('The link to import the playlist from')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('removetrack')
                .setDescription('Remove a track from a playlist'))
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
client.once('ready', () => {
    manager.init(client.user.id);
});

client.on('messageCreate', message => {
    // Check if the message mentions the bot and does not mention everyone
    if (message.mentions.has(client.user) && !message.mentions.everyone) {
        // Send a reply mentioning the bot's prefix
        message.reply(`My prefix is **+**`);
    } else if (message.mentions.everyone) {
        // Do nothing if everyone is mentioned
        return;
    }
});

client.on('raw', (d) => manager.updateVoiceState(d));

let currentPlayer = null;

async function playSong(message, query) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('You need to be in a voice channel to play music!');

    let player = manager.players.get(message.guild.id);

    if (player) {
        const currentVoiceChannel = message.guild.channels.cache.get(player.voiceChannel);
        if (player.playing) {
            return message.reply('Please stop the current queue before playing another song.');
        }
        if (currentVoiceChannel && currentVoiceChannel.id !== voiceChannel.id) {
            return message.reply(`Sorry, I'm already playing in ${currentVoiceChannel.name}`);
        }
    } else {
        player = manager.create({
            guild: message.guild.id,
            voiceChannel: voiceChannel.id,
            textChannel: message.channel.id,
        });

        player.connect();
    }

    const searchResult = await manager.search(query, message.author);
    if (searchResult.loadType === 'NO_MATCHES') return message.reply('No results found or there was an error retrieving the song. Please try again.');
    if (searchResult.loadType === 'LOAD_FAILED') return message.reply('There was an error retrieving the song. Please try again.');

    const track = searchResult.tracks[0];
    player.queue.add(track);

    if (!player.playing && !player.paused && player.queue.totalSize > 0) {
        player.play();
        player.playing = true; // Ensuring the state is set
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(track.title)
        .setURL(track.uri)
        .setDescription(`Now playing: [${track.title}](${track.uri})\nRequested by: ${message.author}`);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('toggle-pause')
                .setEmoji('<:pause_resume:1258784780653433014>')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('stop')
                .setEmoji('<:stop:1258001111835738122>')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('add-to-playlist')
                .setEmoji('<:addtoplaylist:1258000949071446067>')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('set-volume')
                .setEmoji('<:volume:1258015142075961425>')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('set-filter')
                .setEmoji('<:filterc:1258777829902909491>')
                .setStyle(ButtonStyle.Secondary),
        );

    message.channel.send({ embeds: [embed], components: [row] });
}

client.on('messageCreate', async message => {
    if (!message.content.startsWith('+') || message.author.bot) return;
    
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    const userId = message.author.id; // Get user ID for private playlists

    if (command === 'play' || command === 'p') {
        const query = args.join(' ');
        if (!query) return message.reply('Please provide a song name or URL!');
        playSong(message, query);
    }
    
    if (command === 'loop') {
        const player = manager.players.get(message.guildId);
        if (!player) {
            return message.reply('There is no active player!', { ephemeral: true });
        }

        const loopCount = parseInt(args[0]);
        if (isNaN(loopCount) || loopCount <= 0) {
            return message.reply('Please provide a valid number of times to loop the current track.');
        }

        // Set the loop count in the player's data
        player.loopCount = loopCount;
        player.currentLoop = 0;

        // Set track repeat to true to keep looping the current track
        player.setTrackRepeat(true);

        message.reply(`Looping the current track ${loopCount} times.`);
    }

    if (command === 'playlist') {
    const subCommand = args.shift()?.toLowerCase();
    const playlistName = args.join(' ');
    const userId = message.author.id;

    if (!playlistName && ['create', 'delete', 'play', 'import'].includes(subCommand)) {
    return message.reply('Please provide a playlist name!');
}

    switch (subCommand) {
        case 'create':
            if (!playlists[userId]) playlists[userId] = {}; // Initialize user's playlists if not exists
            if (playlists[userId][playlistName]) return message.reply('Playlist already exists!');
            playlists[userId][playlistName] = [];
            fs.writeFileSync('playlists.json', JSON.stringify(playlists, null, 2));
            message.reply(`Playlist ${playlistName} created!`);
            break;

        case 'delete':
            if (!playlists[userId] || !playlists[userId][playlistName]) return message.reply('Playlist not found!');
            delete playlists[userId][playlistName];
            fs.writeFileSync('playlists.json', JSON.stringify(playlists, null, 2));
            message.reply(`Playlist ${playlistName} deleted!`);
            break;

        case 'play':
    if (!playlists[userId] || !playlists[userId][playlistName] || playlists[userId][playlistName].length === 0) {
        return message.reply('Playlist not found or is empty!');
    }
    const playlistSongs = playlists[userId][playlistName];

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('You need to be in a voice channel to play music from a playlist!');

    let player = manager.players.get(message.guild.id);

    if (player) {
        const currentVoiceChannel = client.channels.cache.get(player.voiceChannel);
        if (player.playing) {
            return message.reply('Please stop the current queue before playing another song.');
        }
        if (currentVoiceChannel.id !== voiceChannel.id) {
            return message.reply(`Sorry, I'm already playing in ${currentVoiceChannel.name}`);
        }
    } else {
        player = manager.create({
            guild: message.guild.id,
            voiceChannel: voiceChannel.id,
            textChannel: message.channel.id,
        });

        player.connect();
    }

    player.queue.clear();

    for (const song of playlistSongs) {
        try {
            console.log(`Searching for song: ${song.url}`);
            const searchResult = await manager.search(song.url, message.author);
            console.log(`Search result for ${song.url}:`, searchResult);
            if (!searchResult || searchResult.loadType === 'NO_MATCHES' || searchResult.loadType === 'LOAD_FAILED') {
                console.log(`Skipping song: ${song.url} due to no matches or load failure`);
                continue; // Skip this song if there are no matches or if the load failed
            }

            const track = searchResult.tracks[0];
            console.log(`Track found:`, track);
            if (track) {
                player.queue.add(track);
            }
        } catch (error) {
            console.error(`Error processing song ${song.url}:`, error);
        }
    }

    try {
        if (!player.playing && !player.paused && player.queue.totalSize > 0) {
            player.play();
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Playlist Playback')
            .setDescription(`Now Playing Playlist\nYou can skip song to next by clicking <:next:1258078186584150138>\nYou can previos song by clicking <:back_c:1258078244637376532>\n I hope you enjoy `)
            .setThumbnail('https://cdn.discordapp.com/attachments/1251488666686193778/1260543968089866280/GIF_20240710_122140_386.gif?ex=668fb48d&is=668e630d&hm=5b28974acda9a6f7b67a04eddbc7582995d3eab432da65d977d7dab3a9adc1ad&tps://cdn.discordapp.com/attachments/1207372713879146526/1260526485282881567/GIF_20240710_122140_386.gif?ex=668fa445&is=668e52c5&hm=2823882d2e79a933997271ae0e8ed2f5c1cf1c45c05921821bbd152229a3211a&');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back')
                    .setEmoji('<:back_c:1258078244637376532>')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('stop-playlist')
                    .setEmoji('<:stop:1258001111835738122>')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('set-playlist-volume')
                    .setEmoji('<:volume:1258015142075961425>')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('set-filter')
                    .setEmoji('<:filterc:1258777829902909491>')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setEmoji('<:next:1258078186584150138>')
                    .setStyle(ButtonStyle.Secondary)
            );

        message.channel.send({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error(`Error starting playback:`, error);
    }

    break;
    
    case 'mylists':

            if (!playlists[userId] || Object.keys(playlists[userId]).length === 0) {
                return message.reply('You have no playlists!');
            }

            const userPlaylists5 = Object.keys(playlists[userId]);
            const playlistsPerPage = 25;
            const totalPages = Math.ceil(userPlaylists5.length / playlistsPerPage);
            let currentPage = 0;

            function generatePlaylistOptions(playlists, page = 0) {
                const start = page * playlistsPerPage;
                const end = start + playlistsPerPage;
                return playlists.slice(start, end).map(playlist => ({
                    label: playlist,
                    value: playlist,
                }));
            }

            function createPaginationDropdown(page, totalPages) {
                const options = [];
                for (let i = 0; i < totalPages; i++) {
                    options.push({
                        label: `Page ${i + 1}`,
                        value: i.toString(),
                    });
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('page_dropdown5')
                    .setPlaceholder(`Page ${page + 1}`)
                    .addOptions(options)
                    .setMaxValues(1);

                return new ActionRowBuilder().addComponents(selectMenu);
            }

            function generateActionRow(page) {
                const actionRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
                    .setCustomId('select-playlist5')
                    .setPlaceholder('Select a playlist')
                    .addOptions(generatePlaylistOptions(userPlaylists5, page)));

                return actionRow;
            }

            const initialEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Your Playlists')
                .setDescription('See Your Playlists You Have ⚠ DO NOT CLICK IT ⚠');

            const initialMessage = await message.reply({
                embeds: [initialEmbed],
                components: [generateActionRow(currentPage), createPaginationDropdown(currentPage, totalPages)],
            });

            const collector = initialMessage.createMessageComponentCollector({
                componentType: 'SELECT_MENU',
                time: 60000,
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'page_dropdown5') {
                    currentPage = parseInt(interaction.values[0], 10);
                    await interaction.update({
                        components: [generateActionRow(currentPage), createPaginationDropdown(currentPage, totalPages)],
                    });
                } else if (interaction.customId === 'select-playlist5') {
                    const selectedPlaylist = interaction.values[0];
                    await interaction.update({
                        content: `Selected playlist: ${selectedPlaylist}\n+playlist delete ${selectedPlaylist}\n+playlist play ${selectedPlaylist}`,
                        components: [],
                    });
                }
            });
            break;

        case 'import':
    const importArgs = args.join(' ').split(' ');
    const importPlaylistName = importArgs.shift();
    const importPlaylistLink = importArgs.join(' ');

    if (!importPlaylistName || !importPlaylistLink) {
        return message.reply('Please provide a playlist name and link!');
    }

    if (!playlists[userId]) playlists[userId] = {};
    if (!playlists[userId][importPlaylistName]) playlists[userId][importPlaylistName] = [];

    let searchResult;
    try {
        searchResult = await manager.search(importPlaylistLink, message.author);
    } catch (error) {
        return message.reply('There was an error retrieving the playlist. Please try again.');
    }

    if (searchResult.loadType === 'NO_MATCHES') return message.reply('No results found. Please try again.');
    if (searchResult.loadType === 'LOAD_FAILED') return message.reply('There was an error retrieving the playlist. Please try again.');

    const tracks = searchResult.tracks;
    tracks.forEach(track => {
        playlists[userId][importPlaylistName].push({
            title: track.title,
            url: track.uri
        });
    });

    fs.writeFileSync('playlists.json', JSON.stringify(playlists, null, 2));
    message.reply(`Playlist ${importPlaylistName} imported successfully!`);
    break;
            
            case 'removetrack':
    const userPlaylists = playlists[userId];
    if (!userPlaylists) return message.reply('You have no playlists!');

    const playlistOptions = Object.keys(userPlaylists).map((name) => ({
        label: name.toString(), // Ensure label is a string
        value: name.toString(), // Ensure value is a string
    }));

    const playlistSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('select-playlist-track')
        .setPlaceholder('Select a playlist')
        .addOptions(playlistOptions);

    const row5 = new ActionRowBuilder().addComponents(playlistSelectMenu);

    await message.reply({ content: 'Select your playlist:', components: [row5] });
    break;
    
        default:
            message.reply('Unknown subcommand. Use create, delete, play, or import.');
            break;
    }
}

    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Music Bot Commands')
            .setDescription('Available commands:')
            .addFields(
                { name: '+play <song name or URL>', value: 'Plays a song in your current voice channel.' },
                { name: '+playlist create <name>', value: 'Creates a new playlist.' },
                { name: '+playlist delete <name>', value: 'Deletes an existing playlist.' },
                { name: '+playlist play <name>', value: 'Plays all songs from the specified playlist.' },
                { name: '+playlist import <name> <link>', value: 'Imports a playlist from a link.\nNote : Support SoundCloud & Spotify & Youtube' },
                { name: '+playlist removetrack', value: 'to remove track in your playlists.' },
                { name: '+playlist mylists', value: 'to see how many playlists you have.' },
                { name: '+loop', value: 'To Repeate Track .' },
                { name: '+filters', value: 'Shows filters information.' },
                { name: '+help', value: 'Shows this help message.' }
            );

        message.channel.send({ embeds: [embed] });
    }
    
    if (command === 'filters') {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Available Filters')
      .setDescription(filtersInfo.map((filter, index) => `${index + 1}- ${filter.name}: ${filter.description}`).join('\n'));

    message.channel.send({ embeds: [embed] });
  }
});

// FOR REMOVE TRACK
const MAX_OPTIONS = 25;

function generateTrackOptions(tracks, page = 0) {
    const start = page * MAX_OPTIONS;
    const end = start + MAX_OPTIONS;
    return tracks.slice(start, end).map(track => ({
        label: String(track.title).trim(),
        value: String(track.url).trim(),
    }));
}

function createPaginationDropdown(page, totalPages) {
    const options = [];
    for (let i = 0; i < totalPages; i++) {
        options.push({
            label: `Page ${i + 1}`,
            value: i.toString(),
        });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('page_dropdown')
        .setPlaceholder('Select a page')
        .addOptions(options)
        .setMaxValues(1);

    return new ActionRowBuilder().addComponents(selectMenu);
}

// Event listener for interactions (buttons)
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    const userId = interaction.user.id; // Get user ID for private playlists

    if (interaction.isButton()) {
        const player = manager.players.get(interaction.guild.id);
        if (!player) {
            return interaction.reply('No music player found for this guild.');
        }

        const botVoiceChannel = interaction.guild.members.me.voice.channel;
        const userVoiceChannel = interaction.member.voice.channel;

        if (!botVoiceChannel || !userVoiceChannel || botVoiceChannel.id !== userVoiceChannel.id) {
            return interaction.reply(`Bot is playing at ${botVoiceChannel?.name || 'unknown channel'}, you can't control the bot. Please make sure you are in the correct voice channel.`);
        }

        if (interaction.customId === 'toggle-pause') {
    console.log(`Player state before toggle: playing=${player.playing}, paused=${player.paused}`);
    
    if (player.paused) {
        player.pause(false);
        player.playing = true;
        player.paused = false;
        await interaction.reply('Resumed the music!');
    } else if (player.playing) {
        player.pause(true);
        player.playing = false;
        player.paused = true;
        await interaction.reply('Paused the music!');
    } else {
        await interaction.reply('No music is currently playing.');
    }

    console.log(`Player state after toggle: playing=${player.playing}, paused=${player.paused}`);
} else if (interaction.customId === 'next') {
            if (player.queue.size) {
                player.stop();
                interaction.reply('Skipped to the next track.');
            } else {
                interaction.reply('No more tracks in the queue.');
            }
        } else if (interaction.customId === 'back') {
            if (player.queue.previous) {
                player.queue.unshift(player.queue.previous);
                player.stop();
                interaction.reply('Playing the previous track.');
            } else {
                interaction.reply('No previous track in the queue.');
            }
        } else if (interaction.customId === 'stop') {
            if (player.queue.current) {
                player.destroy();
                interaction.reply('Stopped the music and left the voice channel.');
                if (player.currentLoop >= player.loopCount) {
            player.setTrackRepeat(false); // Disable track repeat after the specified count
            delete player.loopCount;
            delete player.currentLoop;
        }
            } else {
                interaction.reply('No music is currently playing.');
            }
        } else if (interaction.customId === 'stop-playlist') {
            if (player.queue.current) {
                player.destroy();
                interaction.reply('Stopped the playlist and left the voice channel.');
            } else {
                interaction.reply('No playlist is currently playing.');
            }
        } else if (interaction.customId === 'add-to-playlist') {
            const playlistNames = Object.keys(playlists[userId] || {});
            if (playlistNames.length === 0) {
                return interaction.reply('You do not have any playlists to add this song to.');
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select-playlist')
                        .setPlaceholder('Select a playlist')
                        .addOptions(
                            playlistNames.map(name => ({
                                label: name,
                                value: name,
                            }))
                        )
                );

            await interaction.reply({
                content: 'Select a playlist to add this song to:',
                components: [row],
                ephemeral: true,
            });
        } else if (interaction.customId === 'set-filter') {
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select-filter')
          .setPlaceholder('Select a filter')
          .addOptions([
            { label: 'Bass Boost', value: 'bassboost' },
            { label: 'Nightcore', value: 'nightcore' },
            { label: 'Vaporwave', value: 'vaporwave' },
            { label: 'Karaoke', value: 'karaoke' },
            { label: 'Tremolo', value: 'tremolo' },
            { label: 'Vibrato', value: 'vibrato' },  
            { label: 'Reset Filters', value: 'reset' }
          ])
      );

    await interaction.reply({
      content: 'Select a filter:',
      components: [row],
      ephemeral: true,
    });
  } else if (interaction.customId === 'set-volume') {
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select-volume')
                        .setPlaceholder('Select a volume level')
                        .addOptions([
                            {
                                label: '25%',
                                value: '0.25',
                            },
                            {
                                label: '50%',
                                value: '0.5',
                            },
                            {
                                label: '75%',
                                value: '0.75',
                            },
                            {
                                label: '100%',
                                value: '1.0',
                            },
                            {
                                label: '150%',
                                value: '1.5',
                            },
                            {
                                label: '200%',
                                value: '2.0',
                            },
                            {
                                label: '250%',
                                value: '2.5',
                            },
                            {
                                label: '300%',
                                value: '3.0',
                            },
                            {
                                label: '400%',
                                value: '4.0',
                            },
                            {
                                label: '450%',
                                value: '4.5',
                            },
                            {
                                label: '500%',
                                value: '5.0',
                            },
                        ])
                );

            await interaction.reply({
                content: 'Select a volume level:',
                components: [row],
                ephemeral: true,
            });
        } else if (interaction.customId === 'set-playlist-volume') {
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select-playlist-volume')
                        .setPlaceholder('Select a volume level for the playlist')
                        .addOptions([
                            {
                                label: '25%',
                                value: '0.25',
                            },
                            {
                                label: '50%',
                                value: '0.5',
                            },
                            {
                                label: '75%',
                                value: '0.75',
                            },
                            {
                                label: '100%',
                                value: '1.0',
                            },
                            {
                                label: '150%',
                                value: '1.5',
                            },
                            {
                                label: '200%',
                                value: '2.0',
                            },
                            {
                                label: '250%',
                                value: '2.5',
                            },
                            {
                                label: '300%',
                                value: '3.0',
                            },
                            {
                                label: '400%',
                                value: '4.0',
                            },
                            {
                                label: '450%',
                                value: '4.5',
                            },
                            {
                                label: '500%',
                                value: '5.0',
                            },
                        ])
                );

            await interaction.reply({
                content: 'Select a volume level for the playlist:',
                components: [row],
                ephemeral: true,
            });
        }
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select-playlist') {
    const player = manager.players.get(interaction.guild.id);
    if (!player || !player.queue.current) {
        return interaction.reply('No music is currently playing to add to a playlist.');
    }

    const playlistName = interaction.values[0];
    if (!playlists[userId] || !playlists[userId][playlistName]) {
        return interaction.reply('Playlist not found.');
    }

    const currentTrack = {
        title: player.queue.current.title,
        url: player.queue.current.uri
    };
    playlists[userId][playlistName].push(currentTrack);
    fs.writeFileSync('playlists.json', JSON.stringify(playlists, null, 2));

    interaction.reply(`Added [${currentTrack.title}](${currentTrack.url}) to playlist ${playlistName}.`);
} else if (interaction.customId === 'select-filter') {
    const player = manager.players.get(interaction.guildId);
    if (!player) {
      await interaction.update({ content: 'No music is being played!', components: [], ephemeral: true });
      return;
    }

    const filterValue = interaction.values[0];

    const filters = {
      bassboost: { op: 'filters', guildId: player.guild, equalizer: [{ band: 1, gain: 0.3 }, { band: 0, gain: 0.3 }] },
      nightcore: { op: 'filters', guildId: player.guild, timescale: { speed: 1.3, pitch: 1.3, rate: 1.0 } },
      vaporwave: { op: 'filters', guildId: player.guild, timescale: { speed: 0.85, pitch: 0.8, rate: 1.0 }, tremolo: { frequency: 14.0, depth: 0.75 } },
      karaoke: { op: 'filters', guildId: player.guild, karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 } },
      tremolo: { op: 'filters', guildId: player.guild, tremolo: { frequency: 4.0, depth: 0.75 } },
      vibrato: { op: 'filters', guildId: player.guild, vibrato: { frequency: 4.0, depth: 0.75 } },
      reset: { op: 'filters', guildId: player.guild }
    };

    player.node.send(filters[filterValue]);
    await interaction.update({ content: `Applied ${filterValue} filter`, components: [], ephemeral: true });
  } else if (interaction.customId === 'page_dropdown') {
    const selectedPage = parseInt(interaction.values[0]);
    const selectedPlaylist = interaction.message.components[0].components[0].customId.split(':')[1];
    const tracks = playlists[userId][selectedPlaylist];
    const totalPages = Math.ceil(tracks.length / MAX_OPTIONS);

    const trackOptions = generateTrackOptions(tracks, selectedPage);
    const trackSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(`remove-track:${selectedPlaylist}:${selectedPage}`)
        .setPlaceholder('Select a track to remove')
        .addOptions(trackOptions);

    const row = new ActionRowBuilder().addComponents(trackSelectMenu);
    const paginationDropdown = createPaginationDropdown(selectedPage, totalPages);

    await interaction.update({ content: 'Select a track to remove:', components: [row, paginationDropdown] });
} else if (interaction.customId === 'select-playlist-track') {
    const selectedPlaylist = interaction.values[0];
    const tracks = playlists[userId][selectedPlaylist];

    if (!tracks || tracks.length === 0) {
        return interaction.reply('The selected playlist is empty or does not exist.');
    }

    const totalPages = Math.ceil(tracks.length / MAX_OPTIONS);
    let currentPage = 0;

    const trackOptions = generateTrackOptions(tracks, currentPage);
    const trackSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(`remove-track:${selectedPlaylist}:${currentPage}`)
        .setPlaceholder('Select a track to remove')
        .addOptions(trackOptions);

    const row = new ActionRowBuilder().addComponents(trackSelectMenu);
    const paginationDropdown = createPaginationDropdown(currentPage, totalPages);

    await interaction.reply({ content: 'Select a track to remove:', components: [row, paginationDropdown] });
} else if (interaction.customId.startsWith('remove-track:')) {
    const [_, selectedPlaylist, page] = interaction.customId.split(':');
    const currentPage = parseInt(page);
    const tracks = playlists[userId][selectedPlaylist];

    const selectedTrackUrl = interaction.values[0];
    const trackIndex = tracks.findIndex(track => track.url === selectedTrackUrl);
    if (trackIndex > -1) {
        tracks.splice(trackIndex, 1);
        fs.writeFileSync('playlists.json', JSON.stringify(playlists, null, 2));
        await interaction.reply(`Track removed from ${selectedPlaylist}.`);
    } else {
        await interaction.reply('Track not found in the playlist.');
    }
} else if (interaction.customId === 'select-volume') {
            const player = manager.players.get(interaction.guild.id);
            if (!player) {
                return interaction.reply('No music is currently playing.');
            }

            const selectedVolume = parseFloat(interaction.values[0]);
            if (isNaN(selectedVolume) || selectedVolume < 0.25 || selectedVolume > 5.0) {
                return interaction.reply('Invalid volume level selected.');
            }

            player.setVolume(selectedVolume * 100);
            interaction.reply(`Volume set to ${selectedVolume * 100}%.`);
        } else if (interaction.customId === 'select-playlist-volume') {
            const player = manager.players.get(interaction.guild.id);
            if (!player) {
                return interaction.reply('No playlist is currently playing.');
            }

            const selectedVolume = parseFloat(interaction.values[0]);
            if (isNaN(selectedVolume) || selectedVolume < 0.25 || selectedVolume > 5.0) {
                return interaction.reply('Invalid volume level selected.');
            }

            player.setVolume(selectedVolume * 100, 'playlist'); // Set volume specifically for playlist
            interaction.reply(`Playlist volume set to ${selectedVolume * 100}%.`);
        }
    }
});

// Slash Command section
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;
    const userId = interaction.user.id;

    if (commandName === 'play') {
        const query = options.getString('query');
        if (!query) return interaction.reply('Please provide a song name or URL!');
        interactionplay(interaction, query); // Replace with your play function
    }
    
    if (commandName === 'loop') {
        const player = manager.players.get(interaction.guild.id);
        if (!player) {
            return interaction.reply('There is no active player!', { ephemeral: true });
        }

        const loopCount = options.getInteger('count');
        if (isNaN(loopCount) || loopCount <= 0) {
            return interaction.reply('Please provide a valid number of times to loop the current track.', { ephemeral: true });
        }

        // Set the loop count in the player's data
        player.loopCount = loopCount;
        player.currentLoop = 0;

        // Set track repeat to true to keep looping the current track
        player.setTrackRepeat(true);

        interaction.reply(`Looping the current track ${loopCount} times.`);
    }

    if (commandName === 'playlist') {
        const subCommand = options.getSubcommand();
        const playlistName = options.getString('name') || '';
        const playlistLink = options.getString('link') || '';
        const userId = interaction.user.id;
        
        const maxPlaylists = 25; // Maximum number of playlists allowed per user

        if (!playlistName && ['create', 'delete', 'play', 'import'].includes(subCommand)) {
            return interaction.reply('Please provide a playlist name!');
        }

        switch (subCommand) {
            case 'create':
    

    if (!playlists[userId]) playlists[userId] = {}; // Initialize user's playlists if not exists

    // Check if user already has the maximum number of playlists
    if (Object.keys(playlists[userId]).length >= maxPlaylists) {
        interaction.reply(`Sorry, you can't create more playlists because you already have ${maxPlaylists} playlists. Please delete some playlists to create a new one.`);
        break;
    }

    // Check if the playlist already exists
    if (playlists[userId][playlistName]) {
        interaction.reply('Playlist already exists!');
        break;
    }

    // Create the new playlist
    playlists[userId][playlistName] = [];
    fs.writeFileSync('playlists.json', JSON.stringify(playlists, null, 2));
    interaction.reply(`Playlist ${playlistName} created!`);
    break;

            case 'delete':
                if (!playlists[userId] || !playlists[userId][playlistName]) return interaction.reply('Playlist not found!');
                delete playlists[userId][playlistName];
                fs.writeFileSync('playlists.json', JSON.stringify(playlists, null, 2));
                interaction.reply(`Playlist ${playlistName} deleted!`);
                break;
                
                case 'play':
            if (!playlists[userId] || !playlists[userId][playlistName] || playlists[userId][playlistName].length === 0) {
                return interaction.reply('Playlist not found or is empty!');
            }

            const playlistSongs = playlists[userId][playlistName];

            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) return interaction.reply('You need to be in a voice channel to play music from a playlist!');

            let player = manager.players.get(interaction.guild.id);

            if (player) {
                const currentVoiceChannel = client.channels.cache.get(player.voiceChannel);
                if (player.playing) {
                    return interaction.reply('Please stop the current queue before playing another song.');
                }
                if (currentVoiceChannel.id !== voiceChannel.id) {
                    return interaction.reply(`Sorry, I'm already playing in ${currentVoiceChannel.name}`);
                }
            } else {
                player = manager.create({
                    guild: interaction.guild.id,
                    voiceChannel: voiceChannel.id,
                    textChannel: interaction.channel.id,
                });

                player.connect();
            }

            player.queue.clear();

            for (const song of playlistSongs) {
                const searchResult = await manager.search(song.url, interaction.user);
                if (searchResult.loadType === 'NO_MATCHES') continue;
                if (searchResult.loadType === 'LOAD_FAILED') continue;

                const track = searchResult.tracks[0];
                player.queue.add(track);
            }

            if (!player.playing && !player.paused && player.queue.totalSize > 0) {
                player.play();
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Playlist Playback')
                .setDescription(`Now Playing Playlist\nYou can skip song to next by clicking <:next:1258078186584150138>\nYou can previous song by clicking <:back_c:1258078244637376532>\n I hope you enjoy`)
                .setThumbnail('https://cdn.discordapp.com/attachments/1251488666686193778/1260543968089866280/GIF_20240710_122140_386.gif?ex=668fb48d&is=668e630d&hm=5b28974acda9a6f7b67a04eddbc7582995d3eab432da65d977d7dab3a9adc1ad&tps://cdn.discordapp.com/attachments/1207372713879146526/1260526485282881567/GIF_20240710_122140_386.gif?ex=668fa445&is=668e52c5&hm=2823882d2e79a933997271ae0e8ed2f5c1cf1c45c05921821bbd152229a3211a&');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back')
                        .setEmoji('<:back_c:1258078244637376532>')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('stop-playlist')
                        .setEmoji('<:stop:1258001111835738122>')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('set-playlist-volume')
                        .setEmoji('<:volume:1258015142075961425>')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('set-filter')
                        .setEmoji('<:filterc:1258777829902909491>')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setEmoji('<:next:1258078186584150138>')
                        .setStyle(ButtonStyle.Secondary)
                );

            interaction.reply({ embeds: [embed], components: [row] });
                break;
                
                case 'mylists':
    if (!playlists[userId] || Object.keys(playlists[userId]).length === 0) {
        return message.reply('You have no playlists!');
    }

    const userPlaylists5 = Object.keys(playlists[userId]);
    const playlistsPerPage = 25;
    const totalPages = Math.ceil(userPlaylists5.length / playlistsPerPage);
    let currentPage = 0;

    function generatePlaylistOptions(playlists, page = 0) {
        const start = page * playlistsPerPage;
        const end = start + playlistsPerPage;
        return playlists.slice(start, end).map(playlist => ({
            label: playlist,
            value: playlist,
        }));
    }

    function createPaginationDropdown(page, totalPages) {
        const options = [];
        for (let i = 0; i < totalPages; i++) {
            options.push({
                label: `Page ${i + 1}`,
                value: i.toString(),
            });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('page_dropdown5')
            .setPlaceholder(`Page ${page + 1}`)
            .addOptions(options)
            .setMaxValues(1);

        return new ActionRowBuilder().addComponents(selectMenu);
    }

    function generateActionRow(page) {
        const actionRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
            .setCustomId('select-playlist5')
            .setPlaceholder('Select a playlist')
            .addOptions(generatePlaylistOptions(userPlaylists5, page)));

        return actionRow;
    }

    const initialEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Your Playlists')
        .setDescription('See Your Playlists You Have ⚠ DO NO T CLICK IT ⚠');

    const initialMessage = await message.reply({
        embeds: [initialEmbed],
        components: [generateActionRow(currentPage), createPaginationDropdown(currentPage, totalPages)],
    });

    const collector = initialMessage.createMessageComponentCollector({
        componentType: 'SELECT_MENU',
        time: 60000,
    });

    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'page_dropdown5') {
            currentPage = parseInt(interaction.values[0], 10);
            await interaction.update({
                components: [generateActionRow(currentPage), createPaginationDropdown(currentPage, totalPages)],
            });
        } else if (interaction.customId === 'select-playlist53') {
            const selectedPlaylist = interaction.values[0];
            await interaction.update({
                content: `Selected playlist: ${selectedPlaylist}\n+playlist delete ${selectedPlaylist}\n+playlist play ${selectedPlaylist}`,
                components: [],
            });
        }
    });

    break;

            case 'import':
    

    const importArgs = args.join(' ').split(' ');
    const importPlaylistName = importArgs.shift();
    const importPlaylistLink = importArgs.join(' ');

    if (!importPlaylistName || !importPlaylistLink) {
        return message.reply('Please provide a playlist name and link!');
    }

    if (!playlists[userId]) playlists[userId] = {};
    if (!playlists[userId][importPlaylistName]) playlists[userId][importPlaylistName] = [];

    // Check if user has reached the maximum number of playlists
    if (Object.keys(playlists[userId]).length >= maxPlaylists) {
        return message.reply(`Sorry, you can't import more playlists because you already have ${maxPlaylists} playlists. Please delete some playlists to import a new one.`);
    }

    let searchResult;
    try {
        searchResult = await manager.search(importPlaylistLink, message.author);
    } catch (error) {
        return message.reply('There was an error retrieving the playlist. Please try again.');
    }

    if (searchResult.loadType === 'NO_MATCHES') return message.reply('No results found. Please try again.');
    if (searchResult.loadType === 'LOAD_FAILED') return message.reply('There was an error retrieving the playlist. Please try again.');

    const tracks = searchResult.tracks;
    tracks.forEach(track => {
        playlists[userId][importPlaylistName].push({
            title: track.title,
            url: track.uri
        });
    });

    fs.writeFileSync('playlists.json', JSON.stringify(playlists, null, 2));
    message.reply(`Playlist ${importPlaylistName} imported successfully!`);
    break;

            case 'removetrack':
                const userPlaylists = playlists[userId];
                if (!userPlaylists) return interaction.reply('You have no playlists!');

                const playlistOptions = Object.keys(userPlaylists).map((name) => ({
                    label: name.toString(), // Ensure label is a string
                    value: name.toString(), // Ensure value is a string
                }));

                const playlistSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select-playlist-track')
                    .setPlaceholder('Select a playlist')
                    .addOptions(playlistOptions);

                const row3 = new ActionRowBuilder().addComponents(playlistSelectMenu);

                await interaction.reply({ content: 'Select your playlist:', components: [row3] });
                break;

            default:
                interaction.reply('Unknown subcommand. Use create, delete, play, import, or removetrack.');
                break;
        }
    }

    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Music Bot Commands')
            .setDescription('Available commands:')
            .addFields(
                { name: '/play <song name or URL>', value: 'Plays a song in your current voice channel.' },
                { name: '/playlist create <name>', value: 'Creates a new playlist.' },
                { name: '/playlist delete <name>', value: 'Deletes an existing playlist.' },
                { name: '/playlist play <name>', value: 'Plays all songs from the specified playlist.' },
                { name: '/playlist import <name> <link>', value: 'Imports a playlist from a link.\nNote : Support SoundCloud & Spotify & Youtube' },
                { name: '/playlist removetrack', value: 'to remove track in your playlists.' },
                { name: '/playlist mylists', value: 'to see how many playlists you have.' },
                { name: '/loop', value: 'To Repeate Track .' },
                { name: '/filters', value: 'Shows filters information.' },
                { name: '/help', value: 'Shows this help message.' }
            );

        interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'filters') {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Available Filters')
            .setDescription(filtersInfo.map((filter, index) => `${index + 1}- ${filter.name}: ${filter.description}`).join('\n'));

        interaction.reply({ embeds: [embed] });
    }
});


async function interactionplay(interaction, query) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply('You need to be in a voice channel to play music!');
    
    const mm1 = interaction.author;

    let player = manager.players.get(interaction.guild.id);

    if (player) {
        const currentVoiceChannel = interaction.guild.channels.cache.get(player.voiceChannel);
        // If the bot is already playing, inform the user to stop the queue first
        if (player.playing) {
            return interaction.reply('Please stop the current queue before playing another song.');
        }
        // If the bot is in a different voice channel, inform the user
        if (currentVoiceChannel && currentVoiceChannel.id !== voiceChannel.id) {
            return interaction.reply(`Sorry, I'm already playing in ${currentVoiceChannel.name}`);
        }
    } else {
        // Create a new player if it doesn't exist
        player = manager.create({
            guild: interaction.guild.id,
            voiceChannel: voiceChannel.id,
            textChannel: interaction.channel.id,
        });

        player.connect();
    }

    const searchResult = await manager.search(query, interaction.author);
    if (searchResult.loadType === 'NO_MATCHES') return interaction.reply('No results found or there was an error retrieving the song. Please try again.');
    if (searchResult.loadType === 'LOAD_FAILED') return interaction.reply('There was an error retrieving the song. Please try again.');

    const track = searchResult.tracks[0];
    player.queue.add(track);
    if (!player.playing && !player.paused && player.queue.totalSize > 0) player.play();

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(track.title)
        .setURL(track.uri)
        .setDescription(`Now playing: [${track.title}](${track.uri})\nRequested by: ${mm1}`);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('toggle-pause')
                .setEmoji('<:pause_resume:1258784780653433014>')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('stop')
                .setEmoji('<:stop:1258001111835738122>')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('add-to-playlist')
                .setEmoji('<:addtoplaylist:1258000949071446067>')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()  // New button for volume control
                .setCustomId('set-volume')
                .setEmoji('<:volume:1258015142075961425>')
                .setStyle(ButtonStyle.Secondary),
           new ButtonBuilder()  // Volume control button
                        .setCustomId('set-filter')
                        .setEmoji('<:filterc:1258777829902909491>')
                        .setStyle(ButtonStyle.Secondary),
        );

    interaction.reply({ embeds: [embed], components: [row] });
}

// Event listener for when the queue ends
manager.on('queueEnd', async (player) => {
    const guild = client.guilds.cache.get(player.guild);
    if (!guild) return;

    const textChannel = guild.channels.cache.get(player.textChannel);
    if (!textChannel) return;

    textChannel.send('The queue has ended.');
    player.destroy();
});

client.on('voiceStateUpdate', (oldState, newState) => {
    // Check if the bot is alone in the voice channel
    const botId = client.user.id;
    const player = manager.players.get(newState.guild.id);
    if (!player) return;

    const botVoiceChannel = newState.guild.members.me.voice.channel;
    if (!botVoiceChannel) return;

    const nonBotMembers = botVoiceChannel.members.filter(member => !member.user.bot);
    
    if (nonBotMembers.size === 0) {
        setTimeout(() => {
            const updatedBotVoiceChannel = newState.guild.members.me.voice.channel;
            if (!updatedBotVoiceChannel) return;

            const updatedNonBotMembers = updatedBotVoiceChannel.members.filter(member => !member.user.bot);

            if (updatedNonBotMembers.size === 0) {
                player.destroy();
                const textChannel = client.channels.cache.get(player.textChannel);
                if (textChannel) {
                    textChannel.send('No one is in the voice channel. Queue has been destroyed.');
                }
            }
        }, 10000); // 5000 milliseconds = 5 seconds
    }
});
manager.on('playerDisconnect', player => {

    const channel = client.channels.cache.get(player.textChannel);

    channel.send('Disconnected from the voice channel.');

    player.destroy();

});

manager.on('nodeConnect', node => {

    console.log(`Node ${node.options.identifier} connected`);

});

manager.on('trackEnd', (player, track, payload) => {
    if (player.loopCount !== undefined) {
        player.currentLoop++;

        if (player.currentLoop >= player.loopCount) {
            player.setTrackRepeat(false); // Disable track repeat after the specified count
            delete player.loopCount;
            delete player.currentLoop;
        }
    }
});

client.login(token);