const { SlashCommandBuilder } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require('@discordjs/voice');
const { spawn } = require('child_process');

let currentPlayer = null;
let currentResource = null;
let currentConnection = null;
let repeatMode = false;
let currentVolume = 1;

async function getStream(query) {
  try {
    let videoUrl = query;
    const isUrl = /^https?:\/\/(www\.)?(youtube|youtu)\./.test(query);
    if (!isUrl) {
      throw new Error('Chỉ hỗ trợ link YouTube!');
    }
    // yt-dlp lấy audio, pipe qua ffmpeg chuyển sang PCM
    const ytDlp = spawn('yt-dlp', [
      '-f', 'bestaudio',
      '-o', '-',
      '--no-playlist',
      videoUrl
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    // Sử dụng ffmpeg xuất ra Ogg Opus cho Discord
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-f', 'opus',
      '-acodec', 'libopus',
      '-ar', '48000',
      '-ac', '2',
      '-loglevel', 'quiet',
      '-application', 'audio',
      '-frame_duration', '60',
      '-b:a', '128k',
      '-vbr', 'on',
      '-y',
      'pipe:1'
    ], { stdio: ['pipe', 'pipe', 'ignore'] });

    ytDlp.stdout.pipe(ffmpeg.stdin);
    const stream = ffmpeg.stdout;

    // Lấy tiêu đề video qua yt-dlp
    let title = 'YouTube Audio';
    try {
      const infoProc = spawn('yt-dlp', ['--get-title', videoUrl]);
      let data = '';
      for await (const chunk of infoProc.stdout) {
        data += chunk;
      }
      title = data.trim() || title;
    } catch {}
    return {
      stream,
      type: 'arbitrary',
      title,
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Phát nhạc từ link YouTube')
    .addStringOption(opt =>
      opt
        .setName('query')
        .setDescription('Link YouTube hoặc tên bài hát')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Kiểm tra voice channel trước, chỉ reply nếu chưa vào channel
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      console.log('[Music] Không vào voice channel');
      await interaction.reply({
        content: '❌ Bạn phải vào voice channel trước!',
        flags: 64, // ephemeral
      });
      return;
    }

    // deferReply ngay sau khi kiểm tra voice channel, không có log hoặc xử lý nào trước
    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferReply();
      } catch (err) {
        console.log('[Music] deferReply lỗi:', err);
        return;
      }
    } else {
      console.log('[Music] Interaction đã được trả lời hoặc deferred trước đó');
      return;
    }

    try {
      // Sau deferReply mới lấy query và xử lý tiếp
      const query = interaction.options.getString('query');
      console.log('[Music] Query:', query);
      // Lấy stream
      const streamInfo = await getStream(query);
      console.log('[Music] StreamInfo:', streamInfo);

      if (!streamInfo || !streamInfo.stream) {
        console.log('[Music] Không lấy được stream!');
        throw new Error('Không lấy được stream!');
      }

      // Tạo resource
      try {
        // Sử dụng demuxProbe để nhận diện stream Ogg Opus
        const { demuxProbe } = require('@discordjs/voice');
        const probe = await demuxProbe(streamInfo.stream);
        currentResource = createAudioResource(probe.stream, {
          inputType: probe.type,
          inlineVolume: true,
        });
        console.log('[Music] Tạo resource thành công');
      } catch (err) {
        console.log('[Music] Tạo resource lỗi:', err);
        throw err;
      }

      try {
        currentResource.volume.setVolume(currentVolume);
        console.log('[Music] Set volume:', currentVolume);
      } catch (err) {
        console.log('[Music] Set volume lỗi:', err);
      }

      // Tạo player nếu chưa có
      if (!currentPlayer) {
        currentPlayer = createAudioPlayer();
        currentPlayer.on(AudioPlayerStatus.Idle, () => {
          if (repeatMode && currentResource) {
            currentPlayer.play(currentResource);
          }
        });
        currentPlayer.on('error', (error) => {
          console.log('[Music] Player error:', error);
        });
        console.log('[Music] Tạo player mới');
      }

      // Chơi nhạc
      try {
        currentPlayer.play(currentResource);
        console.log('[Music] Bắt đầu phát nhạc');
      } catch (err) {
        console.log('[Music] Play lỗi:', err);
        throw err;
      }

      // Join voice
      try {
        currentConnection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guildId,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });
        currentConnection.subscribe(currentPlayer);
        console.log('[Music] Đã join voice channel và subscribe player');
      } catch (err) {
        console.log('[Music] Join voice lỗi:', err);
        throw err;
      }

      await interaction.editReply({
        content: `▶️ Đang phát: **${streamInfo.title}**`,
      });

    } catch (error) {
      const errorMsg = error.message || 'Lỗi không xác định';
      console.log('[Music] Lỗi tổng:', errorMsg);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: `❌ Lỗi: ${errorMsg}`,
          });
        }
      } catch (e) {
        console.log('[Music] Lỗi khi editReply:', e);
      }
    }
  },

  getState: () => ({
    currentPlayer,
    currentResource,
    repeatMode,
    currentVolume,
  }),

  setRepeat: (val) => {
    repeatMode = val;
    console.log('[Music] Repeat:', repeatMode);
  },

  setVolume: (val) => {
    currentVolume = val;
    if (currentResource && currentResource.volume) {
      currentResource.volume.setVolume(val);
      console.log('[Music] Volume:', val);
    }
  },

  stop: () => {
    if (currentPlayer) {
      currentPlayer.stop();
      currentPlayer = null;
      currentResource = null;
    }
    if (currentConnection) {
      currentConnection.destroy();
      currentConnection = null;
    }
  },
};