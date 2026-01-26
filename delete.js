const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delete")
        .setDescription("Xóa Facebook UID/Page khỏi danh sách theo dõi")
        .addStringOption(option => option.setName("uid").setDescription("UID, username hoặc số thứ tự (vd: #1, #5)").setRequired(true)),
    async execute(interaction, helpers) {
        const { withDB, shortMoney } = helpers;
        
        // Defer ngay lập tức để tránh timeout
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: 64 }).catch(() => null);
        }

        return withDB((db) => {
            let input = interaction.options.getString("uid").trim();
            let uid = input;

            if (!db.facebook_uids) db.facebook_uids = {};

            // Xử lý nếu user nhập số thứ tự (vd: #1, 1, #5)
            const numberMatch = input.match(/^#?(\d+)$/);
            if (numberMatch) {
                const index = parseInt(numberMatch[1]) - 1; // Chuyển từ 1-based sang 0-based
                
                // Lấy danh sách UIDs và sắp xếp giống lệnh /list
                const entries = Object.values(db.facebook_uids);
                entries.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
                
                if (index < 0 || index >= entries.length) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor("#e74c3c")
                            .setAuthor({ name: "Facebook", iconURL: "https://cdn-icons-png.flaticon.com/512/124/124010.png" })
                            .setTitle("❌ Số thứ tự không hợp lệ")
                            .setDescription(`Số thứ tự **#${numberMatch[1]}** không tồn tại.\n\nDùng \`/list\` để xem danh sách.`)
                            .setFooter({ text: "Facebook", iconURL: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" })
                            .setTimestamp()
                        ]
                    });
                }
                
                uid = entries[index].uid;
            } else {
                // Xử lý nếu user nhập username thay vì UID
                const usernameMatch = input.match(/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/(?:profile\.php\?id=)?([^\/?&\s]+)/);
                if (usernameMatch) {
                    uid = usernameMatch[1];
                }
            }

            const entry = db.facebook_uids[uid];

            // Kiểm tra xem UID có tồn tại không
            if (!entry) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor("#e74c3c")
                        .setAuthor({ name: "Facebook", iconURL: "https://cdn-icons-png.flaticon.com/512/124/124010.png" })
                        .setTitle("❌ UID/Page không tồn tại")
                        .setDescription(`UID/Page **${uid}** không được tìm thấy trong danh sách.\n\nDùng \`/list\` để xem danh sách.`)
                        .setFooter({ text: "Facebook", iconURL: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" })
                        .setTimestamp()
                    ]
                });
            }

            // Kiểm tra quyền: chỉ người thêm hoặc admin mới xóa được
            const isOwner = entry.addedBy === interaction.user.id;
            const isAdmin = interaction.member?.permissions?.has("Administrator");
            
            if (!isOwner && !isAdmin) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor("#e74c3c")
                        .setAuthor({ name: "Facebook", iconURL: "https://cdn-icons-png.flaticon.com/512/124/124010.png" })
                        .setTitle("❌ Không có quyền xóa")
                        .setDescription(`Bạn không thể xóa UID/Page này vì bạn không phải người thêm.`)
                        .setFooter({ text: "Facebook", iconURL: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" })
                        .setTimestamp()
                    ]
                });
            }

            // Xóa UID khỏi danh sách
            delete db.facebook_uids[uid];

            const emoji = entry.type === "page" ? "📄" : "👤";

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor("#c0392b")
                    .setAuthor({ name: "Facebook", iconURL: "https://cdn-icons-png.flaticon.com/512/124/124010.png" })
                    .setTitle(`<a:verify:1461889140248416471> ${emoji} Đã xóa khỏi danh sách theo dõi <a:verify:1461889140248416471>`)
                    .setDescription(`**${entry.name}**\n\`${uid}\``)
                    .addFields(
                        { name: "📝 Ghi chú", value: entry.note || "_Không có_", inline: true },
                        { name: "💰 Giá", value: shortMoney(entry.price), inline: true },
                        { name: "🔍 Trạng thái cũ", value: entry.status === "LIVE" ? "✅ LIVE" : "⚠️ DIE", inline: true }
                    )
                    .setImage("https://media.tenor.com/T_D_xmq1rYAAAAAC/facebook-fb.gif")
                    .setFooter({ 
                        text: `Người xóa: ${interaction.user.tag} • Facebook`, 
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp()
                ]
            });
        });
    }
};
