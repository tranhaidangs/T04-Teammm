const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

let roundSeq = 1;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("taixiu")
    .setDescription("Mở phiên Tài/Xỉu (có cầu lịch sử trong game)"),

  async execute(interaction, { 
    withDB, getHistory, money, TX_MIN_BET, TX_MAX_BET, ROUND_SECONDS, CAU_SHOW, 
    formatCau, timeBar, makeButtons, rounds, finishRound
  }) {
    if (!interaction.guildId) {
      return interaction.reply({ content: ":x: Lệnh này chỉ dùng trong server." });
    }

    // Defer reply ngay lập tức để tránh timeout
    await interaction.deferReply();

    const channelId = interaction.channelId;
    if (rounds.has(channelId)) {
      return interaction.editReply({ content: ":x: Đã có phiên Tài/Xỉu đang chạy ở kênh này!" });
    }

    const roundId = `R${roundSeq++}`;
    const bets = new Map();
    const startedAt = Date.now();
    const roundData = { roundId, channelId, bets, startedAt };
    rounds.set(channelId, roundData);

    const cauList = await withDB(async (db) => {
      const hist = getHistory(db, channelId);
      return formatCau(hist, CAU_SHOW);
    });

    // Thống kê nhanh phiên hiện tại
    const buildStats = () => {
      let taiCount = 0;
      let xiuCount = 0;
      let taiTotal = 0;
      let xiuTotal = 0;

      for (const bet of bets.values()) {
        if (bet.side === "tai") {
          taiCount += 1;
          taiTotal += bet.amount;
        } else if (bet.side === "xiu") {
          xiuCount += 1;
          xiuTotal += bet.amount;
        }
      }

      return [
        "**THỐNG KÊ PHIÊN**",
        `• Người chơi: **${bets.size}**`,
        `• ⚫ TÀI: **${taiCount}** người — **${money(taiTotal)}**`,
        `• ⚪ XỈU: **${xiuCount}** người — **${money(xiuTotal)}**`,
      ].join("\n");
    };

    const statsText = buildStats();

    const startEmbed = new EmbedBuilder()
      .setTitle("🎲 TÀI XỈU — ĐẶT CƯỢC")
      .setDescription(
        [
          `<a:clock:1460840072646623355> **Thời gian:** ${ROUND_SECONDS}s để đặt`,
          `💰 **Giới hạn:** Tối thiểu ${money(TX_MIN_BET)} (Không giới hạn tối đa)`,
          "",
          "**Luật:**",
          `• 3 xúc xắc → Tổng 4–10 = ⚪ XỈU | 11–17 = ⚫ TÀI`,
          `• Tổng = 3 hoặc 18 → **Ăn x2** (hòa nếu đặt sai)`,
          "",
          `**Cầu (${CAU_SHOW} gần nhất):**`,
          cauList,
          "",
          statsText,
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
      const msg = await interaction.editReply({ embeds: [startEmbed], components: makeButtons(false) });

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
                .setTitle("<a:1719lpinkwing:1460833430043627552> 🎲 TÀI XỈU — HỦY <a:40349rpinkwings:1460833407746572442>")
                .setDescription("_Không có ai đặt cược._")
                .setColor(0x95a5a6)
                .setFooter({ text: `ID: ${roundId}` });
              await msg.edit({ embeds: [nobet], components: makeButtons(true) }).catch(() => null);
              return;
            }

            await finishRound(roundData, msg);
            return;
          }

          const bar = timeBar(left, ROUND_SECONDS);
          
          // Cập nhật description + thống kê phiên
          const statsNow = buildStats();
          startEmbed.setDescription(
            [
              `<a:clock:1460840072646623355> **Thời gian:** ${ROUND_SECONDS}s để đặt`,
              `💰 **Giới hạn:** Tối thiểu ${money(TX_MIN_BET)} (Không giới hạn tối đa)`,
              "",
              "**Luật:**",
              `• 3 xúc xắc → Tổng 4–10 = ⚪ XỈU | 11–17 = ⚫ TÀI`,
              `• Tổng = 3 hoặc 18 → **Ăn x2** (hòa nếu đặt sai)`,
              "",
              `**Cầu (${CAU_SHOW} gần nhất):**`,
              cauList,
              "",
              statsNow,
            ].join("\n")
          );
          
          startEmbed.spliceFields(0, 3,
            { name: "<a:clock:1460840072646623355> Còn", value: `**${left}s** ${bar}`, inline: true },
            { name: "👥 Đã đặt", value: `**${bets.size}**`, inline: true },
            { name: "🎯 Đặt cược", value: "Nhấn nút bên dưới ⬇️", inline: true }
          );
          await msg.edit({ embeds: [startEmbed] }).catch(() => null);
        } catch (intervalError) {
          console.error('❌ Taixiu interval error:', intervalError);
          clearInterval(interval);
          rounds.delete(channelId);
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Taixiu error:', error.message);
      rounds.delete(channelId);
      await interaction.editReply({ content: `❌ Lỗi: ${error.message}` }).catch(() => null);
    }
  },
};
