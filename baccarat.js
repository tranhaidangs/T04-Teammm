const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("baccarat")
    .setDescription("Chơi Baccarat (Cái/Con) với bot"),

  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: ":x: Lệnh này chỉ dùng trong server." });
    }

    const { shortMoney, SPIN_MIN } = {
      shortMoney: interaction.client.shortMoney,
      SPIN_MIN: interaction.client.SPIN_MIN,
    };

    const modal = new ModalBuilder().setCustomId("BACCARAT_MODAL").setTitle("🃏 BACCARAT 🃏");

    const input = new TextInputBuilder()
      .setCustomId("baccarat_amount")
      .setLabel(`Nhập tiền cược (min ${shortMoney(SPIN_MIN)})`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("VD: 1000 hoặc 5k, 1.5m")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(12);

    const typeInput = new TextInputBuilder()
      .setCustomId("baccarat_type")
      .setLabel("Chọn loại cược (Cái hoặc Con)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Cái hoặc Con")
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(5);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input),
      new ActionRowBuilder().addComponents(typeInput)
    );
    
    try {
      await interaction.showModal(modal);
    } catch (err) {
      try {
        await interaction.reply({ content: ":x: Có lỗi khi mở form. Vui lòng thử lại.", ephemeral: true });
      } catch {}
    }
    return;
  },
};
