const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

let roundSeq = 1;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chanle")
    .setDescription("Mở phiên Chẵn/Lẻ (với hiệu ứng xúc xắc)"),

  async execute(interaction, {
    withDB, money, CL_MIN_BET, CL_MAX_BET, ROUND_SECONDS,
    timeBar, makeCLButtons, rounds, finishCLRound
  }) {
    if (!interaction.guildId) {
      return interaction.reply({ content: ":x: Lệnh này chỉ dùng trong server." });
    }

    const channelId = interaction.channelId;
    if (rounds.has(channelId)) {
      return interaction.reply({ content: ":x: Đã có phiên Chẵn/Lẻ đang chạy ở kênh này!" });
    }

    // Defer reply sau khi check xong
    await interaction.deferReply();

    const roundId = `CL${roundSeq++}`;
    const bets = new Map();
    const startedAt = Date.now();
    const roundData = { roundId, channelId, bets, startedAt };
    rounds.set(channelId, roundData);

    const startEmbed = new EmbedBuilder()
      .setTitle("<a:1719lpinkwing:1460833430043627552> 🎲 CHẴN/LẺ — ĐẶT CƯỢC <a:40349rpinkwings:1460833407746572442>")
      .setDescription(
        [
          `<a:clock:1460840072646623355> **Thời gian:** ${ROUND_SECONDS}s để đặt`,
          `💰 **Giới hạn:** Tối thiểu ${money(CL_MIN_BET)} (Không giới hạn tối đa)`,
          "",
          "**Luật:**",
          `• Tung 1 xúc xắc (1–6)`,
          `• Chẵn (2, 4, 6) vs Lẻ (1, 3, 5)`,
          `• Tỷ lệ thắng: 1:1`,
          "",
          `**Cách chơi:**`,
          `• Nhấn **Đặt CHẴN** hoặc **Đặt LẺ**`,
          `• Nhập số tiền muốn đặt`,
          `• Chờ kết quả (xúc xắc sẽ tung tự động)`,
        ].join("\n")
      )
      .addFields(
        { name: "<a:clock:1460840072646623355> Còn", value: `**${ROUND_SECONDS}s**`, inline: true },
        { name: "👥 Đã đặt", value: "**0**", inline: true },
        { name: "🎯 Đặt cược", value: "Nhấn nút bên dưới ⬇️", inline: true }
      )
      .setColor(0x3498db)
      .setFooter({ text: `ID: ${roundId}` });

    try {
      const msg = await interaction.editReply({ embeds: [startEmbed], components: makeCLButtons(false) });

      const interval = setInterval(async () => {
        try {
          const now = Date.now();
          const elapsed = Math.floor((now - startedAt) / 1000);
          const left = Math.max(0, ROUND_SECONDS - elapsed);

          if (!rounds.has(channelId)) {
            clearInterval(interval);
            return;
          }

          if (left <= 0) {
            clearInterval(interval);
            rounds.delete(channelId);

            if (bets.size === 0) {
              const nobet = new EmbedBuilder()
                .setTitle("<a:1719lpinkwing:1460833430043627552> 🎲 CHẴN/LẺ — HỦY <a:40349rpinkwings:1460833407746572442>")
                .setDescription("_Không có ai đặt cược._")
                .setColor(0x95a5a6)
                .setFooter({ text: `ID: ${roundId}` });
              await msg.edit({ embeds: [nobet], components: makeCLButtons(true) }).catch(() => null);
              return;
            }

            await finishCLRound(roundData, msg);
            return;
          }

          const bar = timeBar(left, ROUND_SECONDS);
          startEmbed.spliceFields(0, 3,
            { name: "<a:clock:1460840072646623355> Còn", value: `**${left}s** ${bar}`, inline: true },
            { name: "👥 Đã đặt", value: `**${bets.size}**`, inline: true },
            { name: "🎯 Đặt cược", value: "Nhấn nút bên dưới ⬇️", inline: true }
          );
          await msg.edit({ embeds: [startEmbed] }).catch(() => null);
        } catch (intervalError) {
          console.error('❌ Chanle interval error:', intervalError);
          clearInterval(interval);
          rounds.delete(channelId);
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Chanle error:', error.message);
      rounds.delete(channelId);
      await interaction.editReply({ content: `❌ Lỗi: ${error.message}` }).catch(() => null);
    }
  },
};
