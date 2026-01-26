const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

function shortMoney(n) {
  const val = Number(n || 0);
  if (val >= 1_000_000_000) {
    return (val / 1_000_000_000)
      .toLocaleString("en-US", { maximumFractionDigits: 1 })
      .replace(/\.0+$/, "") + "B";
  }
  if (val >= 1_000_000) {
    return (val / 1_000_000)
      .toLocaleString("en-US", { maximumFractionDigits: 1 })
      .replace(/\.0+$/, "") + "M";
  }
  if (val >= 1_000) {
    return (val / 1_000)
      .toLocaleString("en-US", { maximumFractionDigits: 1 })
      .replace(/\.0+$/, "") + "K";
  }
  return val.toString();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("menu")
    .setDescription("Xem danh sách lệnh"),

  async execute(interaction, { DAILY_AMOUNT }) {
    const embed = new EmbedBuilder()
      .setAuthor({ 
        name: "📋 MENU BOT GAME", 
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTitle("━━━━━━━━━━━━━━━━━━━━━━")
      .setDescription([
        "╔══════════════════════════╗",
        "║   🎮 **DANH SÁCH LỆNH**   ║",
        "╚══════════════════════════╝",
        "",
      ].join("\n"))
      .addFields(
        {
          name: "🎲 TRẠNG SẮC - TÀI XỈU",
          value: [
            "```/taixiu```",
            "🎯 Mở phiên Tài/Xỉu",
            "⚫ Đặt TÀI (11-17) | ⚪ Đặt XỈU (4-10)",
            "🎉 Tổng 3 hoặc 18 ăn **x2**",
            "💰 Giới hạn: 100 - 1M",
          ].join("\n"),
          inline: false
        },
        {
          name: "🎰 QUAY HŨ MAY MẮN",
          value: [
            "```/quayhu```",
            "🍀 Nhập số tiền quay tự do",
            "🏆 Trúng Jackpot nhận **100%** hũ",
            "🔥 Tỷ lệ thắng: 40% (x1.2 - x5)",
            "⏱️ Cooldown: 10 giây",
          ].join("\n"),
          inline: false
        },
        {
          name: "💰 TÀI CHÍNH & QUẢN LÝ",
          value: [
            "`/balance` - Xem số dư của bạn",
            "`/daily` - Nhận **" + shortMoney(DAILY_AMOUNT) + "** mỗi 24h",
            "`/top` - Bảng xếp hạng giàu nhất",
            "`/give @user [số tiền]` - Chuyển tiền",
            "`/jackpot` - Xem tổng hũ hiện tại",
          ].join("\n"),
          inline: false
        },
        {
          name: "🎲 GAME BẦU CUA",
          value: [
            "```/baucua```",
            "🦀 Chọn 1-6 con vật may mắn",
            "🎯 Tỷ lệ: 1:1, 1:2, 1:3",
            "🎲 3 xúc xắc quyết định",
          ].join("\n"),
          inline: false
        },
        {
          name: "📌 FACEBOOK TRACKER",
          value: [
            "`/add` - Thêm UID/Page theo dõi",
            "`/addlist` - Xem danh sách UID",
            "`/delete` - Xóa UID khỏi list",
            "`/hdsd` - Hướng dẫn chi tiết",
          ].join("\n"),
          inline: false
        }
      )
      .setImage("https://media.tenor.com/wRSc677RNewAAAAC/money-make-it-rain.gif")
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/2331/2331966.png")
      .setColor(0xFF6B6B)
      .setFooter({ 
        text: `🎮 Chơi có trách nhiệm • ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  },
};
