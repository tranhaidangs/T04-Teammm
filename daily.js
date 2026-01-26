const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

function formatLeft(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

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

function makeDailyClaimEmbed({ userId, amount, balance }) {
  return new EmbedBuilder()
    .setTitle("<a:money:1461743657886683422> DAILY THÀNH CÔNG <a:money:1461743657886683422>")
    .setDescription(`Chúc mừng <@${userId}>!`)
    .addFields(
      { name: "<a:money:1461743657886683422> Nhận", value: `**+${shortMoney(amount)}**`, inline: true },
      { name: "<a:money:1461743657886683422> Số dư mới", value: `**${shortMoney(balance)}**`, inline: true },
      { name: "<a:clock:1460840072646623355> Nhận lại sau", value: "**24h**", inline: true }
    )
    .setColor(0x2ecc71)
    .setTimestamp(new Date());
}

function makeDailyCooldownEmbed({ userId, leftMs }) {
  return new EmbedBuilder()
    .setTitle("⏳ CHƯA ĐẾN GIỜ NHẬN DAILY")
    .setDescription(`<@${userId}> bạn đã nhận daily rồi.`)
    .addFields(
      { name: "<a:clock:1460840072646623355> Còn lại", value: `**${formatLeft(leftMs)}**`, inline: true },
      { name: "💡 Gợi ý", value: "Quay lại khi hết thời gian nhé!", inline: true }
    )
    .setColor(0xe67e22)
    .setTimestamp(new Date());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Nhận daily mỗi 24h"),

  async execute(interaction, { withDB, getUser, DAILY_AMOUNT }) {
    const userId = interaction.user.id;
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const res = await withDB(async (db) => {
      const u = getUser(db, userId);
      if (now - u.lastDaily < DAY) {
        const leftMs = DAY - (now - u.lastDaily);
        return { ok: false, leftMs };
      }
      u.lastDaily = now;
      u.balance += DAILY_AMOUNT;
      return { ok: true, amount: DAILY_AMOUNT, balance: u.balance };
    });

    if (!res.ok) {
      return interaction.reply({
        embeds: [makeDailyCooldownEmbed({ userId, leftMs: res.leftMs })],
        ephemeral: true,
      });
    }

    return interaction.reply({
      embeds: [makeDailyClaimEmbed({ userId, amount: res.amount, balance: res.balance })],
    });
  },
};
