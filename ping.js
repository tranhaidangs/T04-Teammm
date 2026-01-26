// file: commands/utility/ping.js
const os = require("os");
const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require("discord.js");

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function quality(ms) {
  if (ms <= 80) return { tag: "🟢 Rất tốt", color: 0x2ecc71 };
  if (ms <= 160) return { tag: "🟡 Ổn", color: 0xf1c40f };
  if (ms <= 300) return { tag: "🟠 Hơi cao", color: 0xe67e22 };
  return { tag: "🔴 Cao", color: 0xe74c3c };
}

function bytesMB(b) {
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Xem độ trễ & trạng thái bot"),

  async execute(interaction) {
    const start = Date.now();
    await interaction.deferReply();

    const api = Math.round(interaction.client.ws.ping || 0);
    const ack = Date.now() - start;
    const uptime = fmtUptime(interaction.client.uptime || 0);
    const mem = process.memoryUsage();
    const cpuLoad = os.loadavg?.()[0] ?? 0;
    const q = quality(api);

    const embed = new EmbedBuilder()
      .setColor(q.color)
      .setTitle("🏓 PING")
      .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "🌐 API", value: `**${api} ms**`, inline: true },
        { name: "🤖 Bot", value: `**${ack} ms**`, inline: true },
        { name: "📊 Đánh giá", value: q.tag, inline: true },
        { name: "⏱️ Uptime", value: uptime, inline: true },
        { name: "🧠 RAM", value: `${bytesMB(mem.rss)} (rss)`, inline: true },
        { name: "🧩 Shard", value: `${interaction.guild?.shardId ?? 0}`, inline: true },
        { name: "💻 CPU load", value: `${cpuLoad.toFixed(2)}`, inline: true },
        { name: "📦 discord.js", value: `v${djsVersion}`, inline: true },
        { name: "🔢 Node", value: process.version, inline: true }
      )
      .setFooter({ text: `Yêu cầu bởi ${interaction.user.username}` })
      .setTimestamp(new Date());

    await interaction.editReply({ embeds: [embed] }).catch(() => null);
  },
};
