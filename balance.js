const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Xem số dư của bạn hoặc người khác")
    .addUserOption((opt) => opt.setName("user").setDescription("Chọn người").setRequired(false)),

  async execute(interaction, { withDB, getUser, shortMoney }) {
    const target = interaction.options.getUser("user") || interaction.user;
    const bal = await withDB(async (db) => getUser(db, target.id).balance);
    return interaction.reply(`<:moneybag:1461745031202341087> Số dư của **${target.username}**: **${shortMoney(bal)}**`);
  },
};
