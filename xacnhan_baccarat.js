const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { activeGames } = require("../../events/modals/baccaratModal.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xacnhan_baccarat")
    .setDescription("Xác nhận lời mời chơi Baccarat với bạn"),

  async execute(interaction) {
    const userId = interaction.user.id;
    // Tìm game pending mà user này là đối thủ
    const pendingKey = Array.from(activeGames.keys()).find(k => k.startsWith("pending_") && k.endsWith("_" + userId));
    if (!pendingKey) {
      return interaction.reply({ content: ":x: Không có lời mời Baccarat nào cần xác nhận.", ephemeral: true });
    }
    const game = activeGames.get(pendingKey);
    if (!game) {
      return interaction.reply({ content: ":x: Lời mời không hợp lệ hoặc đã hết hạn.", ephemeral: true });
    }
    // Hiển thị bảng xác nhận
    const embed = new EmbedBuilder()
      .setTitle("XÁC NHẬN CHƠI BACCARAT")
      .setDescription(`Bạn có đồng ý chơi Baccarat với <@${game.challenger}> với mức cược **${game.amount.toLocaleString()}** không?`)
      .setColor(0x3498db)
      .addFields(
        { name: "Người mời", value: `<@${game.challenger}>`, inline: true },
        { name: "Bạn", value: `<@${game.opponent}>`, inline: true },
        { name: "Mức cược", value: `**${game.amount.toLocaleString()}**`, inline: true }
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`BACCARAT_CONFIRM_${game.challenger}_${game.opponent}`)
        .setLabel("Đồng ý")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`BACCARAT_DECLINE_${game.challenger}_${game.opponent}`)
        .setLabel("Từ chối")
        .setStyle(ButtonStyle.Danger)
    );
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
  },
};
