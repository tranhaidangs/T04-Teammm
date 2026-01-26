const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const https = require("https");

const FB_TOKEN = process.env.FB_TOKEN;
const CHECK_TIMEOUT_MS = 5000;

function checkFacebookUID(uid, type = "user") {
    return new Promise((resolve, reject) => {
        if (type === "page" && !FB_TOKEN) {
            return resolve({ alive: true, name: `Page ${uid}` });
        }

        const pageEndpoint = FB_TOKEN
            ? `https://graph.facebook.com/${uid}?fields=id,name&access_token=${FB_TOKEN}`
            : `https://graph.facebook.com/${uid}?fields=id,name`;
        const endpoint = type === "page"
            ? pageEndpoint
            : `https://graph.facebook.com/${uid}/picture?type=large&redirect=false`;

        https.get(endpoint, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);

                    if (res.statusCode >= 400) {
                        return resolve({ alive: false, message: `HTTP ${res.statusCode}` });
                    }

                    if (json.error) {
                        return resolve({ alive: false, message: json.error.message || "User/Page đã bị block hoặc die" });
                    }

                    if (type === "page" && json.id) {
                        return resolve({ alive: true, name: json.name });
                    }

                    if (json.data && json.data.url) {
                        return resolve({ alive: true });
                    }

                    return resolve({ alive: false, message: "Không thể xác nhận trạng thái" });
                } catch (e) {
                    resolve({ alive: false, message: "Lỗi parse phản hồi" });
                }
            });
        }).on("error", () => resolve({ alive: false, message: "Lỗi kết nối" }));
    });
}

function checkFacebookUIDWithTimeout(uid, type = "user") {
    return Promise.race([
        checkFacebookUID(uid, type),
        new Promise((resolve) => setTimeout(() => resolve({ timeout: true, alive: false, message: "Quá thời gian kiểm tra" }), CHECK_TIMEOUT_MS)),
    ]);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addlist")
        .setDescription("Thêm một danh sách UID/Page hàng loạt")
        .addStringOption(o => o.setName("uids").setDescription("Danh sách UID (cách nhau bằng dấu phẩy, cách, hoặc xuống dòng)").setRequired(true))
        .addStringOption(o => o.setName("note").setDescription("Ghi chú chung cho tất cả UID"))
        .addIntegerOption(o => o.setName("price").setDescription("Giá tiền áp cho tất cả UID"))
        .addStringOption(o => o.setName("type").setDescription("Loại UID").addChoices(
            { name: "👤 User", value: "user" },
            { name: "📄 Page", value: "page" }
        )),

    async execute(interaction, helpers) {
        const { withDB, safeInt, shortMoney } = helpers;
        await interaction.deferReply({ ephemeral: true });

        const raw = interaction.options.getString("uids");
        const note = interaction.options.getString("note") || "";
        const priceInput = interaction.options.getInteger("price");
        const price = priceInput !== null ? safeInt(String(priceInput)) : 0;
        const type = interaction.options.getString("type") || "user";

        // Tách UID từ chuỗi (dấu phẩy, khoảng trắng, xuống dòng)
        const parts = raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);

        // Chuẩn hóa từ URL facebook
        const normalize = (id) => {
            const m = id.match(/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/(?:profile\.php\?id=)?([^\/?&#\s]+)/i);
            return m ? m[1] : id;
        };

        const uids = Array.from(new Set(parts.map(normalize)));

        if (uids.length === 0) {
            return interaction.editReply({ content: ":x: Không tìm thấy UID hợp lệ trong danh sách nhập." });
        }

        const added = [];
        const skipped = [];
        const died = [];

        await withDB(async (db) => {
            if (!db.facebook_uids) db.facebook_uids = {};
            
            for (const uid of uids) {
                if (db.facebook_uids[uid]) {
                    skipped.push(uid);
                    continue;
                }
                
                // Kiểm tra UID có LIVE không
                const checkResult = await checkFacebookUIDWithTimeout(uid, type);
                
                if (!checkResult.alive) {
                    died.push({ uid, reason: checkResult.message || "DIE" });
                    continue;
                }
                
                db.facebook_uids[uid] = {
                    uid,
                    name: checkResult.name || note || uid,
                    note,
                    price,
                    type,
                    status: "LIVE",
                    addedAt: Date.now(),
                    addedBy: interaction.user.id,
                    lastCheck: Date.now(),
                    profileUrl: `https://facebook.com/${uid}`,
                    diedAt: null,
                };
                added.push(uid);
            }
        });

        const embed = new EmbedBuilder()
            .setColor(added.length > 0 ? 0x2ecc71 : 0xe74c3c)
            .setTitle("📥 KẾT QUẢ THÊM DANH SÁCH UID")
            .setDescription([
                `👤 Người thêm: **${interaction.user.tag}**`,
                `📄 Loại: **${type === "page" ? "Page" : "User"}**`,
                note ? `📝 Ghi chú: ${note}` : null,
                price ? `💰 Giá: ${shortMoney(price)}` : null,
                `📊 **Tổng:** ${uids.length} • <a:tick:1460834485703540781> ${added.length} • ⚠️ ${skipped.length} • 💀 ${died.length}`,
            ].filter(Boolean).join("\n"))
            .setTimestamp();

        if (added.length > 0) {
            embed.addFields({ name: `<a:tick:1460834485703540781> Thêm thành công (${added.length})`, value: added.slice(0, 20).map((u, i) => `${i + 1}. \`${u}\``).join("\n"), inline: false });
            if (added.length > 20) embed.addFields({ name: "...", value: `Còn ${added.length - 20} UID khác`, inline: false });
        }

        if (died.length > 0) {
            embed.addFields({ 
                name: `💀 UID đã DIE (bỏ qua) (${died.length})`, 
                value: died.slice(0, 10).map((d, i) => `${i + 1}. \`${d.uid}\` - ${d.reason}`).join("\n"), 
                inline: false 
            });
            if (died.length > 10) embed.addFields({ name: "...", value: `Còn ${died.length - 10} UID khác`, inline: false });
        }

        if (skipped.length > 0) {
            embed.addFields({ name: `⚠️ Đã tồn tại (bỏ qua) (${skipped.length})`, value: skipped.slice(0, 10).map((u, i) => `${i + 1}. \`${u}\``).join("\n"), inline: false });
            if (skipped.length > 10) embed.addFields({ name: "...", value: `Còn ${skipped.length - 10} UID khác`, inline: false });
        }

        return interaction.editReply({ embeds: [embed] });
    }
};
