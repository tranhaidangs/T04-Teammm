const { SlashCommandBuilder } = require('discord.js');
const play = require('./play');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('repeat')
    .setDescription('Bật/tắt lặp lại bài nhạc'),
  async execute(interaction) {
    const state = play.getState();
    play.setRepeat(!state.repeatMode);
    await interaction.reply({ content: state.repeatMode ? '⏹️ Đã tắt lặp lại.' : '🔁 Đã bật lặp lại.' });
  },
};
