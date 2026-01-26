const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("jackpot")
    .setDescription("Xem/quản lý Jackpot (Admin only)")
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Xem thông tin jackpot hiện tại")
    )
    .addSubcommand((sub) =>
      sub
        .setName("guide")
        .setDescription("Hướng dẫn chơi jackpot")
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Thêm tiền vào jackpot (Admin only)")
        .addIntegerOption((opt) =>
          opt.setName("amount").setDescription("Số tiền thêm vào").setRequired(true).setMinValue(0)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setDescription("Reset jackpot về 0 (Admin only)")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, { withDB, getPot, shortMoney }) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (subcommand === "info") {
      const jackpot = await withDB(async (db) => {
        const pot = getPot(db, guildId);
        return pot.txJackpot;
      });
      const infoEmbed = new EmbedBuilder()
        .setTitle("🏆 THÔNG TIN JACKPOT TÀI XỈU 🏆")
        .setDescription("Thông tin về hũ tiền Tài Xỉu hiện tại")
        .setColor(0xFFD700)
        .addFields(
          { name: "<:moneybag:1461745031202341087> Jackpot Tài Xỉu", value: `**${shortMoney(jackpot)}**`, inline: true },
          { name: "🎲 Điều kiện nổ hũ", value: "Ra **111** hoặc **666**", inline: true },
          { name: "👥 Người được chia", value: "Tất cả người **thắng** trong phiên", inline: true },
          { name: "📊 Cách tích lũy", value: "30% tiền từ người thua /taixiu", inline: false }
        )
        .setThumbnail("https://media.tenor.com/images/ec8b3d74ea42e86f5e9b5f1fe19d2b33/tenor.gif")
        .setFooter({ text: "💎 Hệ thống Jackpot Tài Xỉu" })
        .setTimestamp();
      return interaction.reply({ embeds: [infoEmbed] });
    }

    if (subcommand === "guide") {
      const guideEmbed = new EmbedBuilder()
        .setTitle("📖 HƯỚNG DẪN JACKPOT 📖")
        .setColor(0x3498db)
        .setDescription("Hướng dẫn chi tiết cách chơi và kiếm tiền từ Jackpot")
        .addFields(
          {
            name: "🎲 NỐ HŨ LÀ GÌ?",
            value: `Jackpot là một "hũ tiền chung" được tích lũy từ các phiên Tài Xỉu.
Khi ai đó may mắn ra được **111** hoặc **666**, họ sẽ chia jackpot này!`,
            inline: false,
          },
          {
            name: "<:moneybag:1461745031202341087> JACKPOT ĐƯỢC TÍCH LŨY TỪ ĐÂU?",
            value: `• Mỗi phiên /taixiu, tiền của những người **thua** sẽ được tính:
  → 30% tiền thua sẽ được thêm vào jackpot
  → 70% tiền thua được hệ thống giữ

**Ví dụ:**
• Người A thua 100K → Jackpot +30K
• Người B thua 50K → Jackpot +15K
• Jackpot tăng: 45K`,
            inline: false,
          },
          {
            name: "🏆 KÍCH HOẠT NỐ HŨ",
            value: `Jackpot sẽ **NỔ** khi:
• Ra **1️⃣1️⃣1️⃣** (3 con 1)
• Hoặc ra **6️⃣6️⃣6️⃣** (3 con 6)

Những người **THẮNG** trong phiên đó sẽ:
• Nhận tiền cược như bình thường
• **CỘNG THÊM** toàn bộ jackpot chia đều`,
            inline: false,
          },
          {
            name: "📊 VÍ DỤ CỤ THỂ",
            value: `**Phiên 1:** Jackpot = 0
• Người A đặt TÀI 100K, thua → Jackpot = 30K

**Phiên 2:** Jackpot = 30K
• Người B đặt XỈU 50K, thua → Jackpot = 45K

**Phiên 3:** Jackpot = 45K
• Xúc xắc ra: **1️⃣1️⃣1️⃣**
• Người C đặt TÀI 100K, **THẮNG** → Nhận:
  - Tiền cược: 100K
  - Tiền thắng: 100K
  - Từ jackpot: 45K
  - **💰 TỔNG: 245K**
• Jackpot reset = 0`,
            inline: false,
          },
          {
            name: "⚡ MẸO CHƠI",
            value: `• Jackpot càng cao = cơ hội kiếm tiền càng lớn
• Chỉ người **THẮNG** mới chia jackpot (không chia hòa/thua)
• Nổ hũ rất hiếm (xác suất ~5.5%) nên cần kiên nhẫn
• Đặt cược theo quy tắc để tối đa hóa lợi nhuận`,
            inline: false,
          },
          {
            name: "🔧 LỆNH LIÊN QUAN",
            value: `• \`/jackpot info\` - Xem jackpot hiện tại
• \`/taixiu\` - Mở phiên Tài/Xỉu
• \`/balance\` - Xem số dư của bạn`,
            inline: false,
          }
        )
        .setThumbnail("https://media.tenor.com/images/ec8b3d74ea42e86f5e9b5f1fe19d2b33/tenor.gif")
        .setFooter({ text: "💎 Chúc bạn may mắn nổ hũ!" })
        .setTimestamp();

      return interaction.reply({ embeds: [guideEmbed] });
    }

    if (subcommand === "add") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: "❌ Bạn không có quyền",
          ephemeral: true,
        });
      }
      // Hỗ trợ nhập 100k, 100K, 100.000, 100000
      let amount = interaction.options.getInteger("amount");
      if (!amount) {
        const raw = interaction.options.get("amount")?.value?.toString() || "";
        if (/^\d+[kK]$/.test(raw)) amount = parseInt(raw) * 1000;
        else if (/^\d+[mM]$/.test(raw)) amount = parseInt(raw) * 1000000;
        else amount = parseInt(raw.replace(/\D/g, ""));
      }
      if (amount === 100000) amount = 100_000; // đồng bộ 100k
      const newJackpot = await withDB(async (db) => {
        const pot = getPot(db, guildId);
        pot.txJackpot += amount;
        return pot.txJackpot;
      });
      const addEmbed = new EmbedBuilder()
        .setTitle("<:moneybag:1461745031202341087> THÊM TIỀN JACKPOT TÀI XỈU <:moneybag:1461745031202341087>")
        .setColor(0x00FF00)
        .addFields(
          { name: "➕ Số tiền thêm", value: `**${shortMoney(amount)}**`, inline: true },
          { name: "<:moneybag:1461745031202341087> Jackpot Tài Xỉu mới", value: `**${shortMoney(newJackpot)}**`, inline: true },
          { name: "👨‍💼 Admin", value: `<@${interaction.user.id}>`, inline: false }
        )
        .setFooter({ text: "💎 Jackpot đã được cập nhật" })
        .setTimestamp();
      return interaction.reply({ embeds: [addEmbed] });
    }

    if (subcommand === "reset") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: "❌ Bạn không có quyền",
          ephemeral: true,
        });
      }
      const oldJackpot = await withDB(async (db) => {
        const pot = getPot(db, guildId);
        const old = pot.txJackpot;
        pot.txJackpot = 0;
        return old;
      });
      const resetEmbed = new EmbedBuilder()
        .setTitle("🔄 RESET JACKPOT TÀI XỈU 🔄")
        .setColor(0xFF0000)
        .addFields(
          { name: "<:moneybag:1461745031202341087> Jackpot Tài Xỉu cũ", value: `**${shortMoney(oldJackpot)}**`, inline: true },
          { name: "<:moneybag:1461745031202341087> Jackpot Tài Xỉu mới", value: "**0**", inline: true },
          { name: "👨‍💼 Admin", value: `<@${interaction.user.id}>`, inline: false }
        )
        .setFooter({ text: "💎 Jackpot đã được reset" })
        .setTimestamp();
      return interaction.reply({ embeds: [resetEmbed] });
    }
  },
};
