const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ChannelType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');

let OpenAI;
try {
    OpenAI = require('openai');
} catch {
    OpenAI = null;
}

// Template có sẵn
const TEMPLATES = {
    gaming: {
        name: '🎮 Gaming Server',
        roles: [
            { name: '👑 Admin', color: '#e74c3c', permissions: [PermissionFlagsBits.Administrator] },
            { name: '🎮 Gamer', color: '#9b59b6', permissions: [] },
            { name: '👤 Member', color: '#3498db', permissions: [] }
        ],
        categories: [
            {
                name: '📢 THÔNG BÁO',
                channels: [
                    { name: '📋-rules', type: ChannelType.GuildText },
                    { name: '📣-announcements', type: ChannelType.GuildText }
                ]
            },
            {
                name: '💬 CHAT',
                channels: [
                    { name: '💬-general', type: ChannelType.GuildText },
                    { name: '🎮-gaming-chat', type: ChannelType.GuildText }
                ]
            },
            {
                name: '🔊 VOICE',
                channels: [
                    { name: '🎤-voice-1', type: ChannelType.GuildVoice },
                    { name: '🎤-voice-2', type: ChannelType.GuildVoice },
                    { name: '🎵-music', type: ChannelType.GuildVoice }
                ]
            },
            {
                name: '🎮 GAMING',
                channels: [
                    { name: '🎯-valorant', type: ChannelType.GuildText },
                    { name: '⚔️-league-of-legends', type: ChannelType.GuildText },
                    { name: '🔫-cs2', type: ChannelType.GuildText },
                    { name: '🎮-game-voice', type: ChannelType.GuildVoice }
                ]
            }
        ]
    },
    school: {
        name: '📚 School Server',
        roles: [
            { name: '👨‍🏫 Giáo viên', color: '#e67e22', permissions: [PermissionFlagsBits.ManageMessages] },
            { name: '📚 Học sinh', color: '#3498db', permissions: [] },
            { name: '👤 Member', color: '#95a5a6', permissions: [] }
        ],
        categories: [
            {
                name: '📢 THÔNG BÁO',
                channels: [
                    { name: '📋-quy-định', type: ChannelType.GuildText },
                    { name: '📣-thông-báo', type: ChannelType.GuildText }
                ]
            },
            {
                name: '📖 HỌC TẬP',
                channels: [
                    { name: '📐-toán-học', type: ChannelType.GuildText },
                    { name: '🔬-khoa-học', type: ChannelType.GuildText },
                    { name: '📝-văn-học', type: ChannelType.GuildText },
                    { name: '🌍-địa-lý-lịch-sử', type: ChannelType.GuildText },
                    { name: '💻-tin-học', type: ChannelType.GuildText }
                ]
            },
            {
                name: '🗣️ STUDY VOICE',
                channels: [
                    { name: '📚-study-room-1', type: ChannelType.GuildVoice },
                    { name: '📚-study-room-2', type: ChannelType.GuildVoice }
                ]
            },
            {
                name: '💬 GIẢI TRÍ',
                channels: [
                    { name: '💬-general', type: ChannelType.GuildText },
                    { name: '🎮-gaming', type: ChannelType.GuildText },
                    { name: '🔊-chill-voice', type: ChannelType.GuildVoice }
                ]
            }
        ]
    },
    community: {
        name: '🌟 Community Server',
        roles: [
            { name: '👑 Owner', color: '#e74c3c', permissions: [PermissionFlagsBits.Administrator] },
            { name: '⭐ VIP', color: '#f1c40f', permissions: [] },
            { name: '👤 Member', color: '#95a5a6', permissions: [] }
        ],
        categories: [
            {
                name: '📢 INFO',
                channels: [
                    { name: '👋-welcome', type: ChannelType.GuildText },
                    { name: '📋-rules', type: ChannelType.GuildText },
                    { name: '📣-announcements', type: ChannelType.GuildText }
                ]
            },
            {
                name: '💬 CHAT',
                channels: [
                    { name: '💬-general', type: ChannelType.GuildText },
                    { name: '🎨-media-showcase', type: ChannelType.GuildText },
                    { name: '🤝-giới-thiệu', type: ChannelType.GuildText }
                ]
            },
            {
                name: '🔊 VOICE',
                channels: [
                    { name: '🎤-general-voice', type: ChannelType.GuildVoice },
                    { name: '🎵-music', type: ChannelType.GuildVoice }
                ]
            },
            {
                name: '🎮 GIẢI TRÍ',
                channels: [
                    { name: '🎮-gaming', type: ChannelType.GuildText },
                    { name: '🎬-movies-series', type: ChannelType.GuildText },
                    { name: '🎧-music-chat', type: ChannelType.GuildText },
                    { name: '🎮-gaming-voice', type: ChannelType.GuildVoice }
                ]
            }
        ]
    }
};

// Hàm lấy OpenAI client
function getOpenAIClient() {
    if (!OpenAI || !process.env.OPENAI_API_KEY) return null;
    try {
        return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch {
        return null;
    }
}

// Hàm phân tích văn bản bằng AI
async function parseWithAI(userInput) {
    const client = getOpenAIClient();
    if (!client) return null;

    const systemPrompt = `Bạn là trợ lý chuyển mô tả server Discord thành JSON.

Phản hồi BẮT BUỘC là JSON với cấu trúc:
{
  "name": "Tên server",
  "roles": [{"name": "Tên role", "color": "#hex"}],
  "categories": [{
    "name": "TÊN CATEGORY",
    "channels": [{"name": "ten-kenh", "type": "text" hoặc "voice"}]
  }]
}

QUY TẮC:
- Tên channel: viết thường, không dấu, dùng dấu gạch ngang
- Tên category: VIẾT HOA
- Mặc định type là "text"
- Dùng "voice" cho kênh thoại
- Tạo ít nhất 2-3 categories
- Mỗi category có 2-5 channels`;

    try {
        const completion = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: String(userInput) }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 1500
        });

        const content = completion?.choices?.[0]?.message?.content;
        if (!content) return null;

        const parsed = JSON.parse(content);
        
        // Chuẩn hóa dữ liệu
        const template = {
            name: parsed.name || 'Custom Server',
            roles: (parsed.roles || []).map(r => ({
                name: r.name || 'Role',
                color: r.color || undefined,
                permissions: []
            })),
            categories: (parsed.categories || []).map(c => ({
                name: c.name || 'CATEGORY',
                channels: (c.channels || []).map(ch => ({
                    name: ch.name || 'channel',
                    type: String(ch.type || 'text').toLowerCase() === 'voice' 
                        ? ChannelType.GuildVoice 
                        : ChannelType.GuildText
                }))
            }))
        };

        return template.categories.length > 0 ? template : null;
    } catch (error) {
        console.error('❌ AI parsing error:', error.message);
        return null;
    }
}

// Hàm phân tích thông minh không dùng AI
function smartParse(userInput) {
    const input = String(userInput || '').toLowerCase();
    
    // Xác định loại server
    let type = 'general';
    if (input.includes('game') || input.includes('gaming') || input.includes('chơi game')) {
        type = 'gaming';
    } else if (input.includes('học') || input.includes('study') || input.includes('school')) {
        type = 'school';
    } else if (input.includes('cộng đồng') || input.includes('community')) {
        type = 'community';
    }
    
    // Trả về template tương ứng
    return TEMPLATES[type] || {
        name: '🏠 Custom Server',
        roles: [
            { name: '👑 Admin', color: '#e74c3c', permissions: [] },
            { name: '👤 Member', color: '#3498db', permissions: [] }
        ],
        categories: [
            {
                name: '📋 GENERAL',
                channels: [
                    { name: '👋-welcome', type: ChannelType.GuildText },
                    { name: '💬-chat', type: ChannelType.GuildText },
                    { name: '🔊-voice', type: ChannelType.GuildVoice }
                ]
            }
        ]
    };
}

// Hàm xây dựng server
async function buildServerStructure(guild, template) {
    const stats = {
        categories: 0,
        textChannels: 0,
        voiceChannels: 0,
        roles: 0
    };

    // Tạo roles
    for (const roleData of template.roles || []) {
        try {
            await guild.roles.create({
                name: roleData.name,
                color: roleData.color,
                permissions: roleData.permissions || [],
                reason: `BuildServer: ${template.name}`
            });
            stats.roles++;
            await new Promise(r => setTimeout(r, 300));
        } catch (err) {
            console.error(`Lỗi tạo role ${roleData.name}:`, err.message);
        }
    }

    // Tạo categories và channels
    for (const catData of template.categories || []) {
        try {
            const category = await guild.channels.create({
                name: catData.name,
                type: ChannelType.GuildCategory,
                reason: `BuildServer: ${template.name}`
            });
            stats.categories++;
            await new Promise(r => setTimeout(r, 300));

            for (const channelData of catData.channels || []) {
                try {
                    await guild.channels.create({
                        name: channelData.name,
                        type: channelData.type,
                        parent: category.id,
                        reason: `BuildServer: ${template.name}`
                    });

                    if (channelData.type === ChannelType.GuildText) {
                        stats.textChannels++;
                    } else if (channelData.type === ChannelType.GuildVoice) {
                        stats.voiceChannels++;
                    }

                    await new Promise(r => setTimeout(r, 300));
                } catch (err) {
                    console.error(`Lỗi tạo channel ${channelData.name}:`, err.message);
                }
            }
        } catch (err) {
            console.error(`Lỗi tạo category ${catData.name}:`, err.message);
        }
    }

    return stats;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buildserver')
        .setDescription('🏗️ Xây dựng cấu trúc server Discord')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Chọn chế độ xây dựng')
                .setRequired(true)
                .addChoices(
                    { name: '📋 Template Có Sẵn', value: 'template' },
                    { name: '✍️ Mô Tả Tự Do', value: 'custom' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Kiểm tra quyền
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Bạn cần quyền **Administrator** để dùng lệnh này!',
                ephemeral: true
            });
        }

        const mode = interaction.options.getString('mode');

        // CHẾ ĐỘ 1: TEMPLATE
        if (mode === 'template') {
            const embed = new EmbedBuilder()
                .setColor('#00bfff')
                .setTitle('🏗️ CHỌN MẪU SERVER')
                .setDescription([
                    '**Chọn một trong các mẫu server có sẵn:**',
                    '',
                    '🎮 **Gaming Server**',
                    '├─ Roles: Admin, Gamer, Member',
                    '└─ 4 Categories với kênh game, voice',
                    '',
                    '📚 **School Server**',
                    '├─ Roles: Giáo viên, Học sinh, Member',
                    '└─ 4 Categories cho học tập',
                    '',
                    '🌟 **Community Server**',
                    '├─ Roles: Owner, VIP, Member',
                    '└─ 4 Categories cho cộng đồng',
                ].join('\n'))
                .setFooter({ text: 'Chọn template từ menu bên dưới ⬇️' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('buildserver_select')
                .setPlaceholder('🔽 Chọn mẫu server...')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Gaming Server')
                        .setDescription('Server dành cho game thủ')
                        .setValue('gaming')
                        .setEmoji('🎮'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('School Server')
                        .setDescription('Server học tập, trường học')
                        .setValue('school')
                        .setEmoji('📚'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Community Server')
                        .setDescription('Server cộng đồng, giao lưu')
                        .setValue('community')
                        .setEmoji('🌟')
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);
            return interaction.reply({ embeds: [embed], components: [row] });
        }

        // CHẾ ĐỘ 2: CUSTOM
        if (mode === 'custom') {
            await interaction.deferReply();

            const hasAI = getOpenAIClient() !== null;
            
            const embed = new EmbedBuilder()
                .setColor('#00bfff')
                .setTitle('✍️ MÔ TẢ SERVER CỦA BẠN')
                .setDescription([
                    `${hasAI ? '🤖 **AI đang hoạt động**' : '⚙️ **Chế độ thông minh**'}`,
                    '',
                    '**Hãy mô tả server bạn muốn trong 120 giây:**',
                    '',
                    '💡 **Ví dụ:**',
                    '• `Tạo server game với voice channels`',
                    '• `Server học tập với các môn học`',
                    '• `Server streamer với chat và voice`',
                    '• `Tạo server cộng đồng anime`',
                    '',
                    '⏰ **Bạn có 120 giây để trả lời!**'
                ].join('\n'))
                .setFooter({ text: 'Gửi tin nhắn mô tả vào kênh này ⬇️' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            try {
                // Chờ tin nhắn từ user
                const collected = await interaction.channel.awaitMessages({
                    filter: m => m.author.id === interaction.user.id,
                    max: 1,
                    time: 120_000,
                    errors: ['time']
                });

                const userInput = collected.first()?.content;
                let template = null;
                let method = 'basic';

                // Thử parse bằng AI
                if (hasAI) {
                    console.log('🤖 Đang dùng AI parse...');
                    template = await parseWithAI(userInput);
                    if (template) {
                        method = 'ai';
                        console.log('✅ AI parse thành công!');
                    }
                }

                // Nếu AI fail hoặc không có, dùng smart parse
                if (!template) {
                    console.log('⚙️ Dùng smart parse...');
                    template = smartParse(userInput);
                    method = 'smart';
                }

                // Bắt đầu build
                const buildEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle('🏗️ ĐANG XÂY DỰNG...')
                    .setDescription(`Đang tạo **${template.name}**...\n\n⏳ Vui lòng đợi...`)
                    .setFooter({ text: 'Quá trình này có thể mất 1-2 phút' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [buildEmbed] });

                const stats = await buildServerStructure(interaction.guild, template);

                // Thông báo hoàn thành
                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ XÂY DỰNG HOÀN TẤT!')
                    .setDescription(`**${template.name}** đã được tạo thành công!`)
                    .addFields(
                        { name: '🤖 Phương thức', value: method === 'ai' ? '✨ AI' : '⚙️ Thông minh', inline: false },
                        { name: '📁 Categories', value: `${stats.categories}`, inline: true },
                        { name: '💬 Text Channels', value: `${stats.textChannels}`, inline: true },
                        { name: '🔊 Voice Channels', value: `${stats.voiceChannels}`, inline: true },
                        { name: '🎭 Roles', value: `${stats.roles}`, inline: true }
                    )
                    .setFooter({ text: 'Bạn có thể chỉnh sửa thêm!' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });

            } catch (err) {
                if (err.message === 'time') {
                    return interaction.editReply({
                        content: '⏰ **Hết thời gian!** Hãy chạy lại lệnh.',
                        embeds: []
                    });
                }
                throw err;
            }
        }
    },

    // Handler cho select menu
    async handleSelectMenu(interaction, templateType) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ Bạn cần quyền **Administrator**!',
                    ephemeral: true
                });
            }

            await interaction.deferUpdate();

            const template = TEMPLATES[templateType];
            if (!template) {
                return interaction.followUp({
                    content: '❌ Template không tồn tại!',
                    ephemeral: true
                });
            }

            // Thông báo bắt đầu
            const buildEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('🏗️ ĐANG XÂY DỰNG...')
                .setDescription(`Đang tạo **${template.name}**...\n\n⏳ Vui lòng đợi...`)
                .setFooter({ text: 'Quá trình này có thể mất 1-2 phút' })
                .setTimestamp();

            await interaction.editReply({ embeds: [buildEmbed], components: [] });

            // Build server
            const stats = await buildServerStructure(interaction.guild, template);

            // Thông báo hoàn thành
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ XÂY DỰNG HOÀN TẤT!')
                .setDescription(`**${template.name}** đã được tạo thành công!`)
                .addFields(
                    { name: '📁 Categories', value: `${stats.categories}`, inline: true },
                    { name: '💬 Text Channels', value: `${stats.textChannels}`, inline: true },
                    { name: '🔊 Voice Channels', value: `${stats.voiceChannels}`, inline: true },
                    { name: '🎭 Roles', value: `${stats.roles}`, inline: true }
                )
                .setFooter({ text: 'Bạn có thể chỉnh sửa thêm!' })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed], components: [] });

        } catch (error) {
            console.error('❌ Lỗi handleSelectMenu:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ LỖI XÂY DỰNG')
                .setDescription(`Có lỗi xảy ra:\n\`\`\`${error.message}\`\`\``)
                .setFooter({ text: 'Kiểm tra quyền của bot!' })
                .setTimestamp();

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [errorEmbed], components: [] });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            } catch {
                console.error('Không thể gửi error message');
            }
        }
    }
};
