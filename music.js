const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const playdl = require('play-dl');

// Simple in-memory state
let currentPlayer = null;
let currentResource = null;
let repeatMode = false;
let currentVolume = 1;

module.exports = {
  data: [
    new SlashCommandBuilder().setName('play').setDescription('Phát nhạc từ tên hoặc link').addStringOption(opt => opt.setName('query').setDescription('Tên bài hát hoặc link YouTube/Spotify/SoundCloud').setRequired(true)),
    new SlashCommandBuilder().setName('repeat').setDescription('Bật/tắt lặp lại bài nhạc'),
    new SlashCommandBuilder().setName('volume').setDescription('Chỉnh âm lượng').addIntegerOption(opt => opt.setName('level').setDescription('Âm lượng (25/50/75/100)').setRequired(true)),
  ],

  async execute(interaction) {
    const { commandName } = interaction;
    const member = interaction.member;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return interaction.reply({ content: ':x: Bạn phải vào voice channel!', ephemeral: true });

    if (commandName === 'play') {
      const query = interaction.options.getString('query');
      let streamInfo;
      if (playdl.is_url(query)) {
        streamInfo = await playdl.stream(query);
      } else {
        const search = await playdl.search(query, { limit: 1 });
        if (!search.length) return interaction.reply({ content: ':x: Không tìm thấy bài hát!', ephemeral: true });
        streamInfo = await playdl.stream(search[0].url);
      }
      currentResource = createAudioResource(streamInfo.stream, { inputType: streamInfo.type, inlineVolume: true });
      currentResource.volume.setVolume(currentVolume);
      if (!currentPlayer) {
        currentPlayer = createAudioPlayer();
        currentPlayer.on(AudioPlayerStatus.Idle, () => {
          if (repeatMode && currentResource) currentPlayer.play(currentResource);
        });
      }
      currentPlayer.play(currentResource);
      joinVoiceChannel({ channelId: voiceChannel.id, guildId: interaction.guildId, adapterCreator: interaction.guild.voiceAdapterCreator }).subscribe(currentPlayer);
      await interaction.reply({ content: `▶️ Đang phát: ${query}` });
    }
    if (commandName === 'repeat') {
      repeatMode = !repeatMode;
      await interaction.reply({ content: repeatMode ? '🔁 Đã bật lặp lại.' : '⏹️ Đã tắt lặp lại.' });
    }
    if (commandName === 'volume') {
      const level = interaction.options.getInteger('level');
      if (![25,50,75,100].includes(level)) return interaction.reply({ content: ':x: Âm lượng chỉ nhận 25/50/75/100!', ephemeral: true });
      currentVolume = level / 100;
      if (currentResource) currentResource.volume.setVolume(currentVolume);
      await interaction.reply({ content: `🔊 Đã chỉnh âm lượng: ${level}%` });
    }
  },
};
