const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guilds')
        .setDescription('📊 Xem danh sách server mà bot đang ở')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Xem danh sách tất cả server')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Rời khỏi một server')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.user.id !== '945718599824339025') {
            return interaction.reply({
                content: '❌ Chỉ chủ sở hữu bot mới có thể sử dụng lệnh này!',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'list') {
            return handleListGuilds(interaction);
        } else if (subcommand === 'leave') {
            return handleLeaveGuild(interaction);
        }
    }
};

async function handleListGuilds(interaction) {
    const guilds = interaction.client.guilds.cache;
    
    if (guilds.size === 0) {
        return interaction.reply({
            content: '⚠️ Bot không ở server nào cả!',
            flags: 64
        });
    }

    // Tạo danh sách server
    const guildList = guilds
        .map((guild, index) => {
            const memberCount = guild.memberCount || 0;
            return `${index + 1}. **${guild.name}** \`(${guild.id})\`\n   👥 Members: ${memberCount}`;
        })
        .join('\n');

    const options = guilds.map(guild => ({
        label: guild.name.substring(0, 100),
        value: guild.id,
        description: `${guild.memberCount || 0} members`
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('guild_list_info_select')
        .setPlaceholder('Chọn server để xem nhanh thông tin...')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('📊 DANH SÁCH SERVER CỦA BOT')
        .setDescription(guildList)
        .addFields(
            { name: '🌐 Tổng Server', value: `${guilds.size}`, inline: true },
            { name: '👥 Tổng Members', value: `${guilds.reduce((a, g) => a + (g.memberCount || 0), 0)}`, inline: true }
        )
        .setFooter({ text: `Yêu cầu từ: ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row], flags: 64 });

    const filter = (i) => i.customId === 'guild_list_info_select' && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (selectInteraction) => {
        const guildId = selectInteraction.values[0];
        const guild = interaction.client.guilds.cache.get(guildId);

        if (!guild) {
            return selectInteraction.reply({ content: '❌ Không tìm thấy server!', flags: 64 });
        }

        const infoEmbed = await buildGuildInfoEmbed(guild, interaction.user.username);
        return selectInteraction.reply({ embeds: [infoEmbed], flags: 64 });
    });

    collector.on('end', (collected) => {
        if (collected.size === 0) {
            interaction.editReply({
                content: '⏱️ Hết thời gian chờ!',
                embeds: [],
                components: []
            }).catch(() => {});
        }
    });
}

async function buildGuildInfoEmbed(guild, requesterUsername) {
    const owner = await guild.fetchOwner().catch(() => null);
    const textCount = guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText).size;
    const voiceCount = guild.channels.cache.filter(ch => ch.type === ChannelType.GuildVoice).size;
    const categoryCount = guild.channels.cache.filter(ch => ch.type === ChannelType.GuildCategory).size;
    const stageCount = guild.channels.cache.filter(ch => ch.type === ChannelType.GuildStageVoice).size;

    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);
    const boostCount = guild.premiumSubscriptionCount || 0;
    const boostTier = guild.premiumTier || 'None';
    const memberCount = guild.memberCount || 0;

    return new EmbedBuilder()
        .setColor('#00c8ff')
        .setTitle(`📜 ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '🆔 ID', value: guild.id, inline: true },
            { name: '👑 Owner', value: owner ? `<@${owner.id}>` : 'Không lấy được', inline: true },
            { name: '👥 Members', value: `${memberCount}`, inline: true },
            { name: '💬 Text', value: `${textCount}`, inline: true },
            { name: '🔊 Voice', value: `${voiceCount}`, inline: true },
            { name: '🗂️ Category', value: `${categoryCount}`, inline: true },
            { name: '🎤 Stage', value: `${stageCount}`, inline: true },
            { name: '🚀 Boosts', value: `${boostCount} (Tier ${boostTier})`, inline: true },
            { name: '🌐 Locale', value: guild.preferredLocale || 'N/A', inline: true },
            { name: '📅 Created', value: `<t:${createdTimestamp}:R>`, inline: true }
        )
        .setFooter({ text: `Yêu cầu từ: ${requesterUsername}` })
        .setTimestamp();
}

async function handleLeaveGuild(interaction) {
    const guilds = interaction.client.guilds.cache;
    
    if (guilds.size === 0) {
        return interaction.reply({
            content: '⚠️ Bot không ở server nào cả!',
            ephemeral: true
        });
    }

    // Tạo select menu với danh sách server
    const options = guilds.map(guild => ({
        label: guild.name.substring(0, 100),
        value: guild.id,
        description: `${guild.memberCount || 0} members`
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('guild_leave_select')
        .setPlaceholder('Chọn server để rời khỏi...')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setColor('#ff6600')
        .setTitle('🚪 RỜI KHỎI SERVER')
        .setDescription('Chọn server mà bạn muốn bot rời khỏi:')
        .setFooter({ text: 'Lưu ý: Hành động này không thể hoàn tác!' })
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });

    // Xử lý select menu
    const filter = (i) => i.customId === 'guild_leave_select' && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (selectInteraction) => {
        const guildId = selectInteraction.values[0];
        const guild = interaction.client.guilds.cache.get(guildId);

        if (!guild) {
            return selectInteraction.reply({
                content: '❌ Không tìm thấy server!',
                ephemeral: true
            });
        }

        // Tạo confirm button
        const confirmButton = new ButtonBuilder()
            .setCustomId('guild_leave_confirm')
            .setLabel('✅ Xác nhận rời khỏi')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('guild_leave_cancel')
            .setLabel('❌ Hủy')
            .setStyle(ButtonStyle.Secondary);

        const confirmRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        const confirmEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('⚠️ XÁC NHẬN RỜI KHỎI SERVER')
            .setDescription(`**${guild.name}**\nBạn có chắc chắn muốn bot rời khỏi server này không?`)
            .setFooter({ text: 'Hành động này không thể hoàn tác!' });

        await selectInteraction.reply({
            embeds: [confirmEmbed],
            components: [confirmRow],
            ephemeral: true
        });

        const confirmFilter = (i) => i.user.id === interaction.user.id;
        const confirmCollector = selectInteraction.channel.createMessageComponentCollector({ confirmFilter, time: 30000 });

        confirmCollector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId === 'guild_leave_confirm') {
                try {
                    await guild.leave();
                    const successEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ THÀNH CÔNG')
                        .setDescription(`Bot đã rời khỏi server **${guild.name}**`)
                        .setTimestamp();

                    await buttonInteraction.reply({
                        embeds: [successEmbed],
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error leaving guild:', error);
                    await buttonInteraction.reply({
                        content: '❌ Lỗi khi rời khỏi server!',
                        ephemeral: true
                    });
                }
            } else if (buttonInteraction.customId === 'guild_leave_cancel') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('❌ ĐÃ HỦY')
                    .setDescription('Hành động đã bị hủy')
                    .setTimestamp();

                await buttonInteraction.reply({
                    embeds: [cancelEmbed],
                    ephemeral: true
                });
            }
            confirmCollector.stop();
        });

        confirmCollector.on('end', (collected) => {
            if (collected.size === 0) {
                selectInteraction.editReply({
                    content: '⏱️ Hết thời gian chờ!',
                    embeds: [],
                    components: []
                }).catch(() => {});
            }
        });
    });

    collector.on('end', (collected) => {
        if (collected.size === 0) {
            interaction.editReply({
                content: '⏱️ Hết thời gian chờ!',
                embeds: [],
                components: []
            }).catch(() => {});
        }
    });
}
