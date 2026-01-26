const { SlashCommandBuilder } = require('discord.js');
const play = require('./play');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Chỉnh âm lượng')
    .addIntegerOption(opt => opt.setName('level').setDescription('Âm lượng (25/50/75/100)').setRequired(true)),
  async execute(interaction) {
    const level = interaction.options.getInteger('level');
    if (![25,50,75,100].includes(level)) return interaction.reply({ content: ':x: Âm lượng chỉ nhận 25/50/75/100!', ephemeral: true });
    play.setVolume(level / 100);
    await interaction.reply({ content: `🔊 Đã chỉnh âm lượng: ${level}%` });
  },
};
