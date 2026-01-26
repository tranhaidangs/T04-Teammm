const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("getemoji")
        .setDescription("Lấy thông tin chi tiết của emoji")
        .addStringOption(option => 
            option.setName("emoji")
                .setDescription("Emoji cần lấy thông tin (gửi emoji hoặc paste)")
                .setRequired(true)
        ),
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const input = interaction.options.getString("emoji");
        
        // Parse custom emoji: <:name:id> hoặc <a:name:id>
        const customMatch = input.match(/<(a?):([^:]+):(\d+)>/);
        
        if (customMatch) {
            const [, animated, name, id] = customMatch;
            const isAnimated = animated === "a";
            const emojiURL = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? "gif" : "png"}?size=96`;
            
            const embed = new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("📋 Thông tin Emoji")
                .setThumbnail(emojiURL)
                .addFields(
                    { name: "🏷️ Tên", value: `\`${name}\``, inline: true },
                    { name: "🆔 ID", value: `\`${id}\``, inline: true },
                    { name: "🎬 Loại", value: isAnimated ? "🎥 Động" : "🖼️ Tĩnh", inline: true },
                    { name: "📝 Format Raw", value: `\`\`\`${input}\`\`\``, inline: false },
                    { name: "📝 Format Code", value: `\`\`\`<${animated}:${name}:${id}>\`\`\``, inline: false },
                    { name: "🔗 URL", value: `[Xem ảnh gốc](${emojiURL})`, inline: false }
                )
                .setImage(emojiURL)
                .setFooter({ text: `ID: ${id}` })
                .setTimestamp();
            
            return interaction.editReply({ embeds: [embed] });
        }
        
        // Nếu là emoji Unicode thông thường
        const embed = new EmbedBuilder()
            .setColor("#FEE75C")
            .setTitle("⚠️ Emoji Unicode")
            .setDescription([
                `Emoji: ${input}`,
                "",
                "**Đây là emoji Unicode mặc định.**",
                "Chỉ có custom emoji của server mới có ID.",
                "",
                "💡 **Cách sử dụng:**",
                "- Upload emoji vào server",
                "- Dùng lệnh này với custom emoji"
            ].join("\n"))
            .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
    }
};
