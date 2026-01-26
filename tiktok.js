// commands/utility/tiktok.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../../data.json");

function loadDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const init = { users: {}, history: {}, pots: {}, tiktok_accounts: {} };
      fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2), "utf-8");
      return init;
    }
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    parsed.tiktok_accounts ??= {};
    return parsed;
  } catch (e) {
    console.error(":x: load data.json error:", e);
    return { tiktok_accounts: {} };
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

function shortMoney(n) {
  const val = Number(n || 0);
  if (val >= 1_000_000_000) {
    return (val / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 }).replace(/\.0+$/, "") + "B";
  }
  if (val >= 1_000_000) {
    return (val / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 }).replace(/\.0+$/, "") + "M";
  }
  if (val >= 1_000) {
    return (val / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 }).replace(/\.0+$/, "") + "K";
  }
  return val.toString();
}

function checkTikTokUserSimple(username) {
  return new Promise((resolve) => {
    const https = require("https");
    const url = `https://www.tiktok.com/@${username}`;
    https.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on("error", () => {
      resolve(false);
    });
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("Quản lý kiểm tra TikTok account (thêm/xóa/danh sách)")
    .addSubcommand(sub =>
      sub.setName("add")
        .setDescription("Thêm TikTok account để tháo tác")
        .addStringOption(opt =>
          opt.setName("username")
            .setDescription("Username TikTok (không có @)")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName("price")
            .setDescription("Giá account (ví dụ: 100k hoặc 1M)")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName("note")
            .setDescription("Ghi chú")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName("remove")
        .setDescription("Xóa TikTok account khỏi danh sách")
        .addStringOption(opt =>
          opt.setName("numbers")
            .setDescription("Danh sách số thứ tự cần xóa (ví dụ: 1,3,5 hoặc 2-4 hoặc all)")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("list")
        .setDescription("Xem danh sách TikTok account đang tháo tác")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const db = loadDB();

    if (subcommand === "add") {
      const username = interaction.options.getString("username").trim().toLowerCase();
      const priceStr = interaction.options.getString("price") || "0";
      const note = interaction.options.getString("note") || "";

      // Parse giá
      let price = 0;
      const priceLower = priceStr.toLowerCase();
      if (priceLower.endsWith("m")) {
        price = Math.floor(parseFloat(priceLower) * 1_000_000);
      } else if (priceLower.endsWith("k")) {
        price = Math.floor(parseFloat(priceLower) * 1_000);
      } else if (priceLower.endsWith("b")) {
        price = Math.floor(parseFloat(priceLower) * 1_000_000_000);
      } else {
        price = Math.floor(parseFloat(priceLower));
      }

      if (db.tiktok_accounts[username]) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff6b6b)
              .setTitle("❌ Account đã tồn tại")
              .setDescription(`@${username} đã có trong danh sách`)
              .setTimestamp()
          ],
          ephemeral: true
        });
      }

      // Mặc định LIVE khi thêm mới, checker background sẽ kiểm tra định kỳ
      const isLive = true;

      db.tiktok_accounts[username] = {
        username,
        price,
        note,
        status: "LIVE",
        addedBy: interaction.user.id,
        addedAt: Date.now(),
        lastCheck: Date.now(),
        diedAt: null
      };

      saveDB(db);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("<a:verify:1461889140248416471> <:69594tiktokicon:1461744029329920166> Thêm account thành công <a:verify:1461889140248416471>")
            .addFields(
              { name: "👤 Username", value: `@${username}`, inline: true },
              { name: "💰 Giá", value: price > 0 ? `**${shortMoney(price)}**` : "_Không có_", inline: true },
              { name: "📝 Ghi chú", value: note || "_Không có_", inline: true },
              { name: "🔍 Trạng thái", value: "🟢 LIVE (Đang theo dõi)", inline: true }
            )
            .setTimestamp()
        ],
        ephemeral: true
      });
    }

    if (subcommand === "remove") {
      const accounts = Object.values(db.tiktok_accounts);

      if (accounts.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("❌ Danh sách trống")
              .setDescription("Không có account nào để xóa")
              .setTimestamp()
          ],
          ephemeral: true
        });
      }

      const numbersStr = (interaction.options.getString("numbers") || "").trim().toLowerCase();
      if (!numbersStr) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("❌ Thiếu tham số")
              .setDescription("Vui lòng cung cấp danh sách số thứ tự cần xóa, ví dụ: 1,3,5 hoặc 2-4 hoặc all")
              .setTimestamp()
          ],
          ephemeral: true
        });
      }

      const max = accounts.length;
      const set = new Set();
      const invalidTokens = [];

      const tokens = numbersStr.split(/[ ,]+/).filter(Boolean);
      for (const t of tokens) {
        if (t === "all") {
          for (let i = 1; i <= max; i++) set.add(i);
          continue;
        }
        const m = t.match(/^([0-9]+)-([0-9]+)$/);
        if (m) {
          let a = Number(m[1]);
          let b = Number(m[2]);
          if (!Number.isFinite(a) || !Number.isFinite(b)) {
            invalidTokens.push(t);
            continue;
          }
          if (a > b) [a, b] = [b, a];
          for (let i = a; i <= b; i++) set.add(i);
          continue;
        }
        const n = Number(t);
        if (Number.isFinite(n)) {
          set.add(n);
        } else {
          invalidTokens.push(t);
        }
      }

      const indices = Array.from(set).filter(i => i >= 1 && i <= max).sort((a,b)=>a-b);
      const invalidOutOfRange = Array.from(set).filter(i => i < 1 || i > max);

      if (indices.length === 0) {
        const msg = invalidTokens.length || invalidOutOfRange.length
          ? `Các giá trị không hợp lệ: ${[...invalidTokens, ...invalidOutOfRange.map(String)].join(", ")}`
          : `Không có số thứ tự hợp lệ (1-${max}).`;
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle("❌ Dữ liệu xóa không hợp lệ")
              .setDescription(msg)
              .setTimestamp()
          ],
          ephemeral: true
        });
      }

      const usernamesToDelete = Array.from(new Set(indices.map(i => accounts[i-1]?.username).filter(Boolean)));

      for (const u of usernamesToDelete) {
        delete db.tiktok_accounts[u];
      }
      saveDB(db);

      const removedList = usernamesToDelete.map(u => `@${u}`).join(", ");
      const extraInfo = (invalidTokens.length || invalidOutOfRange.length)
        ? `\n\n⚠️ Bỏ qua giá trị không hợp lệ: ${[...invalidTokens, ...invalidOutOfRange.map(String)].join(", ")}`
        : "";

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("<a:verify:1461889140248416471> <:69594tiktokicon:1461744029329920166> Xóa nhiều account thành công <a:verify:1461889140248416471>")
            .setDescription(`Đã xóa: ${removedList}${extraInfo}`)
            .setTimestamp()
        ],
        ephemeral: true
      });
    }

    if (subcommand === "list") {
      const accounts = Object.values(db.tiktok_accounts);

      if (accounts.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x95a5a6)
              .setTitle("📋 Danh sách TikTok")
              .setDescription("_Chưa có account nào được thêm_")
              .setTimestamp()
          ],
          ephemeral: true
        });
      }

      const fields = accounts.map((acc, idx) => ({
        name: `${idx + 1}. @${acc.username}`,
        value: [
          `• Giá: ${acc.price > 0 ? `**${shortMoney(acc.price)}**` : "_Không có_"}`,
          `• Ghi chú: ${acc.note || "_Không có_"}`,
          `• Trạng thái: ${acc.status === "LIVE" ? "🟢 LIVE" : "🔴 DIE"}`,
          `• Người thêm: <@${acc.addedBy}>`,
          `• Thêm vào: ${new Date(acc.addedAt).toLocaleString("vi-VN")}`
        ].join("\n"),
        inline: false
      }));

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("📋 Danh sách TikTok đang thao tác")
        .setDescription(`Tổng: **${accounts.length}** account`)
        .addFields(fields)
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  }
};
