// commands/utility/setmoney.js
const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../../data.json");

function loadDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const init = { users: {}, history: {}, pots: {} };
      fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2), "utf-8");
      return init;
    }
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    parsed.users ??= {};
    parsed.history ??= {};
    parsed.pots ??= {};
    return parsed;
  } catch (e) {
    console.error(":x: load data.json error:", e);
    return { users: {}, history: {}, pots: {} };
  }
}

function saveDB(db) {
  try {
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf-8");
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error(":x: save data.json error:", e);
  }
}

function money(n) {
  const val = Number(n || 0);
  return new Intl.NumberFormat("vi-VN").format(val);
}

function shortMoney(n) {
  const val = Number(n || 0);
  if (val >= 1000000000) {
    return (val / 1000000000).toLocaleString('en-US', { maximumFractionDigits: 1 }).replace(/\.0+$/, '') + 'B';
  }
  if (val >= 1000000) {
    return (val / 1000000).toLocaleString('en-US', { maximumFractionDigits: 1 }).replace(/\.0+$/, '') + 'M';
  }
  if (val >= 1000) {
    return (val / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }).replace(/\.0+$/, '') + 'K';
  }
  return val.toString();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setmoney")
    .setDescription("Set số tiền cho người dùng (Admin only)")
    .addUserOption((opt) => 
      opt.setName("user")
        .setDescription("Người cần set tiền")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      console.log("✅ setmoney command triggered");
      
      // Kiểm tra quyền admin
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        console.log("❌ User không phải admin");
        const errorEmbed = new EmbedBuilder()
          .setTitle("❌ Lỗi - Quyền không đủ")
          .setDescription("Bạn không có quyền sử dụng lệnh này!")
          .setColor(0xff0000)
          .addFields({ name: "Yêu cầu", value: "Administrator Permission", inline: true })
          .setTimestamp();
        
        return interaction.reply({ 
          embeds: [errorEmbed], 
          ephemeral: true 
        });
      }

      const targetUser = interaction.options.getUser("user");
      console.log(`👤 Target user: ${targetUser?.username || "NOT FOUND"}`);

      if (!targetUser) {
        const errorEmbed = new EmbedBuilder()
          .setTitle("❌ Lỗi - Người dùng không tìm thấy")
          .setColor(0xff0000)
          .setTimestamp();
        
        return interaction.reply({ 
          embeds: [errorEmbed], 
          ephemeral: true 
        });
      }

      // Tạo modal nhập số tiền
      const modal = new ModalBuilder()
        .setCustomId(`setmoney_modal_${targetUser.id}`)
        .setTitle(`<:moneybag:1461745031202341087> Set tiền cho ${targetUser.username}`);

      const amountInput = new TextInputBuilder()
        .setCustomId("amount")
        .setLabel("Nhập số tiền")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Ví dụ: 1000000 hoặc 1M")
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(20);

      modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
      console.log("📋 Showing modal...");
      await interaction.showModal(modal);
      console.log("✅ Modal shown successfully");

    } catch (error) {
      console.error("setmoney error:", error);
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Lỗi - Có sự cố xảy ra")
        .setDescription("```" + error.message + "```")
        .setColor(0xff0000)
        .setTimestamp();
      
      return interaction.reply({ 
        embeds: [errorEmbed], 
        ephemeral: true 
      });
    }
  },
};
