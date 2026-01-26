const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("give")
    .setDescription("Chuyển tiền cho người khác")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Người nhận tiền").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("amount").setDescription("Số tiền chuyển (VD: 1000 hoặc 1M)").setRequired(true)
    ),

  async execute(interaction, { withDB, getUser, money, shortMoney, safeInt }) {
    const sender = interaction.user;
    const receiver = interaction.options.getUser("user");
    const amountStr = interaction.options.getString("amount");

    if (receiver.id === sender.id) {
      return interaction.reply({
        content: "❌ Bạn không thể chuyển tiền cho chính mình!",
        ephemeral: true,
      });
    }

    if (receiver.bot) {
      return interaction.reply({
        content: "❌ Không thể chuyển tiền cho bot!",
        ephemeral: true,
      });
    }

    const amount = safeInt(amountStr);

    if (!Number.isFinite(amount) || amount <= 0) {
      return interaction.reply({
        content: "❌ Số tiền phải là một số dương hợp lệ!",
        ephemeral: true,
      });
    }

    // Kiểm tra và thực hiện chuyển tiền
    const res = await withDB(async (db) => {
      const senderUser = getUser(db, sender.id);
      const receiverUser = getUser(db, receiver.id);

      if (senderUser.balance < amount) {
        return {
          ok: false,
          reason: "not_enough",
          balance: senderUser.balance,
        };
      }

      senderUser.balance -= amount;
      receiverUser.balance += amount;

      return {
        ok: true,
        senderBalance: senderUser.balance,
        receiverBalance: receiverUser.balance,
      };
    });

    if (!res.ok) {
      if (res.reason === "not_enough") {
        return interaction.reply({
          content: `:x: Bạn không đủ tiền. Số dư: **${shortMoney(res.balance)}**`,
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: ":x: Có lỗi xảy ra",
        ephemeral: true,
      });
    }

    const transferEmbed = new EmbedBuilder()
      .setTitle("<a:verify:1461889140248416471> CHUYỂN TIỀN THÀNH CÔNG <a:verify:1461889140248416471>")
      .setColor(0x00FF00)
      .addFields(
        { name: "📤 Người gửi", value: `<@${sender.id}>`, inline: true },
        { name: "📥 Người nhận", value: `<@${receiver.id}>`, inline: true },
        { name: "\u200b", value: "\u200b", inline: true },
        { name: "<:moneybag:1461745031202341087> Số tiền gửi", value: `**${shortMoney(amount)}**`, inline: true },
        { name: "<a:clock:1460840072646623355> Thời gian", value: new Date().toLocaleString("vi-VN"), inline: true },
        { name: "\u200b", value: "\u200b", inline: true },
        {
          name: "<:moneybag:1461745031202341087> Số dư của bạn sau",
          value: `**${shortMoney(res.senderBalance)}**`,
          inline: true,
        },
        {
          name: "<:moneybag:1461745031202341087> Số dư người nhận",
          value: `**${shortMoney(res.receiverBalance)}**`,
          inline: true,
        }
      )
      .setThumbnail(sender.displayAvatarURL({ size: 256 }))
      .setImage("https://media.tenor.com/3kxOkaqjBMkAAAAC/money-cash.gif")
      .setFooter({ text: "💎 Giao dịch đã được lưu vào hệ thống" })
      .setTimestamp();

    return interaction.reply({ embeds: [transferEmbed] });
  },
};
