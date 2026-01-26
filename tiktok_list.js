const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tiktok_list")
    .setDescription("Xem danh sách TikTok account đang theo dõi"),

  async execute(interaction, { withDB, shortMoney }) {
    try {
      const isAdmin = interaction.user.id === process.env.OWNER_ID;
      
      // Defer reply để tránh timeout (admin xem ẩn)
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: isAdmin });
      }

      const data = await withDB(async (db) => {
        return db.tiktok_accounts || {};
      });

      const entries = Object.values(data);

      if (entries.length === 0) {
        return await interaction.editReply({
          content: ":x: Chưa có TikTok account nào được theo dõi. Dùng `/tiktok` để thêm!",
          embeds: [],
        });
      }

      // Sắp xếp theo thời gian thêm
      entries.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

      const liveEntries = entries.filter(e => e.status === "LIVE");
      const dieEntries = entries.filter(e => e.status === "DIE");

      const listEmbed = new EmbedBuilder()
        .setTitle("<:69594tiktokicon:1461744029329920166> DANH SÁCH TIKTOK ACCOUNT ĐANG THEO DÕI")
        .setDescription([
          `<a:tick:1460834485703540781> LIVE: **${liveEntries.length}** | 🔴 DIE: **${dieEntries.length}** | 📦 TỔNG: **${entries.length}**`,
          `<a:clock:1460840072646623355> Kiểm tra tự động: mỗi 1 phút`,
        ].join("\n"))
        .setColor(0x000000)
        .setThumbnail("https://cdn-icons-png.flaticon.com/512/3046/3046121.png")
        .setFooter({ 
          text: "Hệ thống tự động quét và cảnh báo LIVE/DIE",
          iconURL: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png"
        })
        .setTimestamp();

      // Hiển thị LIVE entries
      if (liveEntries.length > 0) {
        const liveLines = liveEntries.map((e, idx) => {
          if (!e.username) return null;
          const price = e.price ? shortMoney(e.price) : "0";
          let line = `🎵 **#${idx + 1}** [@${e.username}](https://www.tiktok.com/@${e.username}) | 💰${price}`;
          if (isAdmin && e.addedBy) {
            line += ` | 👤<@${e.addedBy}>`;
          }
          return line;
        }).filter(Boolean);

        // Chia thành các field nếu quá dài (max 1024 ký tự/field)
        let currentField = "";
        let fieldCount = 0;
        for (const line of liveLines) {
          if ((currentField + line + "\n").length > 1000) {
            if (currentField) {
              listEmbed.addFields({
                name: fieldCount === 0 ? `<a:tick:1460834485703540781> LIVE Accounts (${liveEntries.length})` : "═ LIVE tiếp ═",
                value: currentField.trim(),
                inline: false,
              });
              fieldCount++;
              currentField = "";
            }
          }
          currentField += line + "\n";
        }
        if (currentField) {
          listEmbed.addFields({
            name: fieldCount === 0 ? `<a:tick:1460834485703540781> LIVE Accounts (${liveEntries.length})` : "═ LIVE tiếp ═",
            value: currentField.trim(),
            inline: false,
          });
        }
      }

      // Hiển thị DIE entries
      if (dieEntries.length > 0) {
        const dieLines = dieEntries.map((e, idx) => {
          if (!e.username) return null;
          const price = e.price ? shortMoney(e.price) : "0";
          let line = `🎵 **#${idx + 1}** [@${e.username}](https://www.tiktok.com/@${e.username}) | 💰${price}`;
          if (isAdmin && e.addedBy) {
            line += ` | 👤<@${e.addedBy}>`;
          }
          return line;
        }).filter(Boolean);

        // Chia thành các field nếu quá dài
        let currentField = "";
        let fieldCount = 0;
        for (const line of dieLines) {
          if ((currentField + line + "\n").length > 1000) {
            if (currentField) {
              listEmbed.addFields({
                name: fieldCount === 0 ? `🔴 DIE Accounts (${dieEntries.length})` : "═ DIE tiếp ═",
                value: currentField.trim(),
                inline: false,
              });
              fieldCount++;
              currentField = "";
            }
          }
          currentField += line + "\n";
        }
        if (currentField) {
          listEmbed.addFields({
            name: fieldCount === 0 ? `🔴 DIE Accounts (${dieEntries.length})` : "═ DIE tiếp ═",
            value: currentField.trim(),
            inline: false,
          });
        }
      }

      return await interaction.editReply({ embeds: [listEmbed] });
    } catch (err) {
      console.error("❌ Lỗi tiktok_list command:", err.message);
      if (err.message.includes("Unknown interaction") || err.message.includes("already been acknowledged")) {
        console.log("⚠️ Interaction issue - skipped");
        return;
      }
      try {
        return await interaction.editReply({ content: "❌ Lỗi: " + err.message }).catch(() => null);
      } catch (e) {
        return await interaction.reply({ content: "❌ Lỗi: " + err.message, ephemeral: true }).catch(() => null);
      }
    }
  },
};
