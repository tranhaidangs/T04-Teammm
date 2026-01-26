const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const https = require("https");

// Token Facebook (nếu có) để check page ổn định hơn
const FB_TOKEN = process.env.FB_TOKEN;
const CHECK_TIMEOUT_MS = 5000;

function checkFacebookUID(uid, type = "user") {
    return new Promise((resolve, reject) => {
        // Nếu type là page mà không có token, coi là LIVE (không thể verify)
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

                    // HTTP lỗi xem như DIE để tránh thêm UID chết
                    if (res.statusCode >= 400) {
                        return resolve({ alive: false, message: `HTTP ${res.statusCode}` });
                    }

                    // API trả error => DIE
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
                    // Lỗi parse => coi như DIE để báo sớm
                    resolve({ alive: false, message: "Lỗi parse phản hồi" });
                }
            });
        }).on("error", reject);
    });
}

function checkFacebookUIDWithTimeout(uid, type = "user") {
    return Promise.race([
        checkFacebookUID(uid, type),
        new Promise((resolve) => setTimeout(() => resolve({ timeout: true, alive: false, message: "Quá thời gian kiểm tra (5s), thử lại" }), CHECK_TIMEOUT_MS)),
    ]);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("add")
        .setDescription("Thêm Facebook UID/Page để theo dõi live/die")
        .addStringOption(option => option.setName("uid").setDescription("Facebook UID hoặc username").setRequired(true))
        .addStringOption(option => option.setName("note").setDescription("Ghi chú về tài khoản").setRequired(true))
        .addIntegerOption(option => option.setName("price").setDescription("Số tiền").setRequired(true))
        .addStringOption(option => option.setName("type").setDescription("Loại kiểm tra").setRequired(true)
            .addChoices(
                { name: "👤 User Profile", value: "user" },
                { name: "📄 Facebook Page", value: "page" }
            )),
    async execute(interaction, helpers) {
        const { withDB, safeInt, shortMoney } = helpers;
        await interaction.deferReply({ ephemeral: true });
        
        return withDB((db) => {
            const userId = interaction.user.id;
            let uid = interaction.options.getString("uid");
            const note = interaction.options.getString("note");
            const priceInput = interaction.options.getInteger("price");
            const price = safeInt(String(priceInput));
            const type = interaction.options.getString("type");
            
            // Xử lý nếu user nhập username thay vì UID
            const usernameMatch = uid.match(/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/(?:profile\.php\?id=)?([^\/?&\s]+)/);
            if (usernameMatch) {
                uid = usernameMatch[1];
            }
            
            if (!db.facebook_uids) db.facebook_uids = {};
            
            // Kiểm tra xem UID đã tồn tại chưa
            if (db.facebook_uids[uid]) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor("#FF0000")
                        .setAuthor({ name: "Facebook", iconURL: "https://cdn-icons-png.flaticon.com/512/124/124010.png" })
                        .setTitle("❌ UID/Page đã tồn tại")
                        .setDescription(`UID/Page **${uid}** đã được thêm trước đó.`)
                        .setThumbnail("https://media.tenor.com/gUiu1zyxfzYAAAAi/copyright-dispute-piracy.gif")
                        .setFooter({ text: "Facebook", iconURL: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" })
                        .setTimestamp()
                    ]
                });
            }
            
            // Kiểm tra live/die
            return checkFacebookUIDWithTimeout(uid, type).then(result => {
                if (result.timeout) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor("#f1c40f")
                            .setAuthor({ name: "Facebook", iconURL: "https://cdn-icons-png.flaticon.com/512/124/124010.png" })
                            .setTitle("⏳ Chậm quá 5 giây")
                            .setDescription("Facebook phản hồi chậm, hãy thử lại sau ít phút.")
                            .setFooter({ text: "Facebook", iconURL: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" })
                            .setTimestamp()
                        ]
                    });
                }

                // Nếu UID DIE, từ chối thêm vào
                if (!result.alive) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor("#e74c3c")
                            .setAuthor({ name: "Facebook", iconURL: "https://cdn-icons-png.flaticon.com/512/124/124010.png" })
                            .setTitle("💀 UID/PAGE ĐÃ DIE")
                            .setDescription(
                                [
                                    `⚠️ **UID/Page này đã die, không thể thêm!**`,
                                    "",
                                    `🔗 UID: \`${uid}\``,
                                    `📝 Ghi chú: ${note}`,
                                    `💰 Giá: ${shortMoney(price)}`,
                                    "",
                                    `**Lý do:** ${result.message || "User/Page đã bị block hoặc die"}`,
                                ].join("\n")
                            )
                            .setThumbnail("https://media.tenor.com/wpSo-8CrXqUAAAAi/piffle-error.gif")
                            .setFooter({ text: "Không thể thêm UID đã die", iconURL: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" })
                            .setTimestamp()
                        ]
                    });
                }
                
                const profileUrl = type === "page" 
                    ? `https://facebook.com/${uid}`
                    : `https://facebook.com/${uid}`;
                
                db.facebook_uids[uid] = {
                    uid,
                    name: result.name || note,
                    note,
                    price,
                    type,
                    status: "LIVE",
                    addedAt: Date.now(),
                    addedBy: userId,
                    lastCheck: Date.now(),
                    profileUrl,
                    diedAt: null
                };
                
                const emoji = type === "page" ? "📄" : "👤";
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: "Facebook Checker", iconURL: "https://cdn-icons-png.flaticon.com/512/145/145802.png" })
                            .setColor("#00b894")
                            .setTitle(`✅ Đã thêm ${type === "page" ? "Page" : "User"} vào danh sách theo dõi!`)
                            .setDescription([
                                `${emoji} **${result.name || note}**`,
                                `🆔 [${uid}](${profileUrl})`,
                                "",
                                `🔗 [Mở Facebook](${profileUrl})`,
                            ].join("\n"))
                            .addFields(
                                { name: "📝 Ghi chú", value: note || "Không có", inline: true },
                                { name: "💰 Giá theo dõi", value: shortMoney(price), inline: true },
                                { name: "Trạng thái", value: "🟢 LIVE", inline: true }
                            )
                            .setThumbnail(`https://graph.facebook.com/${uid}/picture?type=large`)
                            .setImage("https://media.tenor.com/hzHOBo-BD9wAAAAC/facebook-fb.gif")
                            .setFooter({ 
                                text: `Người thêm: ${interaction.user.tag} • Facebook`, 
                                iconURL: interaction.user.displayAvatarURL()
                            })
                            .setTimestamp()
                    ]
                });
            }).catch(err => {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setAuthor({ name: "Facebook", iconURL: "https://cdn-icons-png.flaticon.com/512/124/124010.png" })
                        .setColor("#e74c3c")
                        .setTitle("❌ Lỗi khi kiểm tra UID/Page")
                        .setDescription(`Không thể kiểm tra UID/Page **${uid}**\n\`\`\`${err.message}\`\`\``)
                        .setThumbnail("https://media.tenor.com/wpSo-8CrXqUAAAAi/piffle-error.gif")
                        .setImage("https://media.tenor.com/T_D_xmq1rYAAAAAC/facebook-fb.gif")
                        .setFooter({ text: "Facebook", iconURL: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" })
                        .setTimestamp()
                    ]
                });
            });
        });
    }
};
