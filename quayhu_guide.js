const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quayhu_guide")
    .setDescription("Xem luật/quy tắc quay hũ"),
  async execute(interaction, { shortMoney, SPIN_MIN }) {
    return interaction.reply({
      embeds: [
        {
          title: "📖 LUẬT CHƠI QUAY HŨ 📖",
          color: 0xFFD700,
          description:
            `• Quay hũ là trò chơi may mắn với ma trận 3x3 biểu tượng.\n• Đặt số tiền muốn quay (tối thiểu ${shortMoney ? shortMoney(SPIN_MIN) : '100'}).\n• 30% số tiền mỗi lượt sẽ cộng vào jackpot chung.\n\n**Cách thắng:**\n- Nếu 1 hàng ngang bất kỳ có 3 biểu tượng giống nhau: NỔ JACKPOT!\n- Nếu cả 3 hàng đều giống nhau: JACKPOT X2!\n- Nếu xuất hiện 7️⃣ hoặc 💫 ở bất kỳ ô nào: JACKPOT!\n- Nếu không trúng, sẽ nhận lại một phần tiền hoặc mất trắng (tùy xác suất).\n\n**Jackpot:**\n- Khi nổ, bạn nhận toàn bộ jackpot + tiền cược.\n- Jackpot sẽ reset về 0 sau khi nổ.\n\n**Lưu ý:**\n- Quay càng nhiều, jackpot càng lớn!\n- Chơi vui, không nên lạm dụng!`,
        },
      ],
      ephemeral: true,
    });
  },
};
