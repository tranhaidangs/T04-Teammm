const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("Xem danh sách Facebook UID đang theo dõi"),

  async execute(interaction, { withDB, shortMoney }) {
    try {
      const isAdmin = interaction.user.id === process.env.OWNER_ID;
      
      // Defer reply để tránh timeout (admin xem ẩn)
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: isAdmin });
      }

      const data = await withDB(async (db) => {
        return db.facebook_uids || {};
      });

      const entries = Object.values(data);

      if (entries.length === 0) {
        return await interaction.editReply({
          content: ":x: Chưa có UID nào được theo dõi. Dùng `/add` để thêm!",
          embeds: [],
        });
      }

      // Sắp xếp theo thời gian thêm
      entries.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

      const liveEntries = entries.filter(e => e.status === "LIVE");
      const dieEntries = entries.filter(e => e.status === "DIE");

      const listEmbed = new EmbedBuilder()
        .setTitle("🌐 𝗙𝗔𝗖𝗘𝗕𝗢𝗢𝗞 𝗨𝗜𝗗 𝗧𝗥𝗔𝗖𝗞𝗘𝗥")
        .setDescription([
          `🟢 **LIVE:** [1m${liveEntries.length}[0m   |   🔴 **DIE:** [1m${dieEntries.length}[0m   |   📦 **TỔNG:** [1m${entries.length}[0m`,
          `⏱️ Kiểm tra tự động: mỗi 1 phút`,
          "\u200B",
          "💡 **Hệ thống sẽ tự động quét và cảnh báo LIVE/DIE.**",
        ].join("\n"))
        .setColor("#4267B2")
        .setThumbnail("https://cdn-icons-png.flaticon.com/512/124/124010.png")
        .setImage("https://media.tenor.com/hzHOBo-BD9wAAAAC/facebook-fb.gif")
        .setFooter({ 
          text: `Cập nhật lúc: ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
          iconURL: "https://cdn-icons-png.flaticon.com/512/124/124010.png"
        })
        .setTimestamp();

      // Hiển thị LIVE entries
      if (liveEntries.length > 0) {
        let liveCounter = 0;
        const liveLines = liveEntries.map((e) => {
          if (!e.uid) return null;
          liveCounter++;
          const typeIcon = e.type === "page" ? "📄" : "👤";
          const price = e.price ? shortMoney(e.price) : "0";
          let line = `${typeIcon} **#${liveCounter}** [${e.uid}](https://facebook.com/${e.uid}) | 💰${price}`;
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
                name: fieldCount === 0 ? `🟢 LIVE UIDs (${liveEntries.length})` : "─ LIVE tiếp ─",
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
            name: fieldCount === 0 ? `<a:tick:1460834485703540781> LIVE UIDs (${liveEntries.length})` : "═ LIVE tiếp ═",
            value: currentField.trim(),
            inline: false,
          });
        }
      }

      // Hiển thị DIE entries
      if (dieEntries.length > 0) {
        let dieCounter = 0;
        const dieLines = dieEntries.map((e) => {
          if (!e.uid) return null;
          dieCounter++;
          const typeIcon = e.type === "page" ? "📄" : "👤";
          const price = e.price ? shortMoney(e.price) : "0";
          let line = `${typeIcon} **#${dieCounter}** [${e.uid}](https://facebook.com/${e.uid}) | 💰${price}`;
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
                name: fieldCount === 0 ? `🔴 DIE UIDs (${dieEntries.length})` : "─ DIE tiếp ─",
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
            name: fieldCount === 0 ? `🔴 DIE UIDs (${dieEntries.length})` : "═ DIE tiếp ═",
            value: currentField.trim(),
            inline: false,
          });
        }
      }

      return await interaction.editReply({ embeds: [listEmbed] });
    } catch (err) {
      console.error("❌ Lỗi list command:", err.message);
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

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  if (minutes > 0) return `${minutes} phút trước`;
  return "Vừa xong";
}
