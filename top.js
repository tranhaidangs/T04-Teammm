const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("Top giàu nhất (top 10)"),

  async execute(interaction, { withDB, shortMoney }) {
    const lines = await withDB(async (db) => {
      const entries = Object.entries(db.users).map(([id, v]) => ({
        id,
        balance: Number(v.balance || 0),
      }));
      entries.sort((a, b) => b.balance - a.balance);
      const top10 = entries.slice(0, 10);
      if (!top10.length) return null;

      return top10.map((x, i) => {
        const medal =
          i === 0 ? ":first_place:" : i === 1 ? ":second_place:" : i === 2 ? ":third_place:" : ":small_blue_diamond:";
        return `${medal} **#${i + 1}** <@${x.id}> — **<:moneybag:1461745031202341087> ${shortMoney(x.balance)}**`;
      });
    });

    if (!lines) return interaction.reply("Chưa có dữ liệu. Hãy /daily hoặc /taixiu trước.");
    return interaction.reply(`:trophy: **BẢNG XẾP HẠNG GIÀU NHẤT**\n${lines.join("\n")}`);
  },
};
