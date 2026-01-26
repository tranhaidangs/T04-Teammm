const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("hdsd")
        .setDescription("Hướng dẫn sử dụng lệnh theo dõi Facebook UID/Page"),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const embed = new EmbedBuilder()
            .setColor("#1877f2")
            .setAuthor({ name: "Facebook UID/Page & TikTok", iconURL: "https://cdn-icons-png.flaticon.com/512/124/124010.png" })
            .setTitle("📖 HƯỚNG DẪN SỬ DỤNG")
            .setDescription("Hệ thống theo dõi tự động Facebook UID/Page & TikTok - Phát hiện live/die")
            .addFields(
                {
                    name: "🎵 `/tiktok` - Quản lý TikTok account",
                    value: [
                        "**Cú pháp thêm:**",
                        "```/tiktok add username:[username] price:[tiền] note:[ghi chú]```",
                        "",
                        "**Ví dụ 1: Thêm account TikTok**",
                        "```/tiktok add username:user_tiktok price:500000 note:Account có 10k follower```",
                        "",
                        "**Ví dụ 2: Thêm không ghi chú**",
                        "```/tiktok add username:tiktok_account price:1M```",
                        "",
                        "**Cú pháp xóa:**",
                        "```/tiktok remove number:[số thứ tự]```",
                        "",
                        "**Cú pháp xem danh sách:**",
                        "```/tiktok list```",
                        "",
                        "✅ Bot kiểm tra mỗi 1 phút",
                        "✅ Thông báo khi LIVE → DIE hoặc DIE → LIVE",
                        "✅ Gửi tin nhắn riêng cho người thêm"
                    ].join("\n"),
                    inline: false
                },
                {
                    name: "📌 `/add` - Thêm UID/Page để theo dõi",
                    value: [
                        "**Cú pháp:**",
                        "```/add uid:[UID] note:[ghi chú] price:[tiền] type:[loại]```",
                        "",
                        "**Ví dụ 1: Thêm User Profile**",
                        "```/add uid:100027207563311 note:Clone MMO price:100k type:user```",
                        "",
                        "**Ví dụ 2: Thêm Facebook Page**",
                        "```/add uid:100063870973287 note:Page 65k sub price:100k type:page```",
                        "",
                        "**Ví dụ 3: Dùng link thay UID**",
                        "```/add uid:facebook.com/profile.php?id=100027207563311 note:Clone price:100k type:user```",
                        "",
                        "✅ Bot sẽ tự động kiểm tra mỗi 1 phút",
                        "✅ Thông báo khi phát hiện DIE"
                    ].join("\n"),
                    inline: false
                },
                {
                    name: "� `/addlist` - Thêm nhiều UID hàng loạt",    
                    value: [
                        "**Cú pháp:**",
                        "```/addlist uids:[danh sách UID] note:[ghi chú] price:[tiền] type:[loại]```",
                        "",
                        "**Ví dụ 1: Thêm nhiều User (dấu phẩy)**",
                        "```/addlist uids:100027207563311,100063870973287,100089765432109 note:Clone MMO price:50k type:user```",
                        "",
                        "**Ví dụ 2: Thêm nhiều Page (cách nhau khoảng trắng)**",
                        "```/addlist uids:100063870973287 100027207563311 note:Page bán hàng price:100m type:page```",
                        "",
                        "**Ví dụ 3: Dùng link Facebook**",
                        "```/addlist uids:facebook.com/profile.php?id=100027207563311,fb.com/100063870973287 price:100k```",
                        "",
                        "✅ Bot tự động kiểm tra từng UID",
                        "✅ Bỏ qua UID đã DIE hoặc đã tồn tại",
                        "✅ Báo cáo chi tiết: thành công, DIE, trùng"
                    ].join("\n"),
                    inline: false
                },
                {
                    name: "� `/addlist` - Thêm nhiều UID hàng loạt",
                    value: [
                        "**Cú pháp:**",
                        "```/list```",
                        "",
                        "📊 Hiển thị:",
                        "- ✅ LIVE: Tất cả UID đang sống",
                        "- 💀 DIE: Tất cả UID đã die",
                        "- 💰 Giá tiền từng UID",
                        "- 🕐 Thời gian check cuối",
                        "",
                        "⚠️ **Lưu ý:**",
                        "- Người dùng thường: Chỉ xem UID mình thêm",
                        "- Admin: Xem tất cả UID của mọi người"
                    ].join("\n"),
                    inline: false
                },
                {
                    name: "🗑️ `/delete` - Xóa UID/Page khỏi danh sách",
                    value: [
                        "**Cú pháp:**",
                        "```/delete uid:[UID]```",
                        "",
                        "**Ví dụ:**",
                        "```/delete uid:100027207563311```",
                        "",
                        "⚠️ **Lưu ý:**",
                        "- Chỉ xóa được UID mình thêm",
                        "- Admin có thể xóa bất kỳ UID nào",
                        "- Không thể khôi phục sau khi xóa"
                    ].join("\n"),
                    inline: false
                },
                {
                    name: "🔔 Thông báo tự động",
                    value: [
                        "✅ Bot kiểm tra mỗi **1 phút**",
                        "✅ Gửi thông báo khi phát hiện **LIVE → DIE** & **DIE → LIVE**",
                        "✅ Admin nhận thông báo của **tất cả account**",
                        "✅ Người thêm nhận thông báo **account của mình**"
                    ].join("\n"),
                    inline: false
                },
                {
                    name: "❓ Cách lấy UID Facebook",
                    value: [
                        "**Cách 1:** Từ URL profile",
                        "- URL dạng: `facebook.com/profile.php?id=100027207563311`",
                        "- UID là: `100027207563311`",
                        "",
                        "**Cách 2:** Dùng công cụ",
                        "- Truy cập: findmyfbid.com",
                        "- Dán link Facebook vào → Lấy UID",
                        "",
                        "**Cách 3:** Dán luôn link",
                        "- Bot sẽ tự động trích xuất UID từ link"
                    ].join("\n"),
                    inline: false
                }
            )
            .setImage("https://media.tenor.com/hzHOBo-BD9wAAAAC/facebook-fb.gif")
            .setFooter({ 
                text: `Cần hỗ trợ? ${process.env.OWNER_ID ? `<@${process.env.OWNER_ID}>` : '@Admin'}`,
                iconURL: "https://cdn-icons-png.flaticon.com/512/174/174848.png"
            })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
