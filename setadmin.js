const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ADMINS_FILE = path.join(__dirname, '../../admins.json');

function loadAdmins() {
    try {
        if (fs.existsSync(ADMINS_FILE)) {
            const data = fs.readFileSync(ADMINS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return { admins: [] };
    } catch (error) {
        console.error('Error loading admins:', error);
        return { admins: [] };
    }
}

function saveAdmins(data) {
    try {
        fs.writeFileSync(ADMINS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving admins:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setadmin')
        .setDescription('🛡️ Quản lý admin của bot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Thêm admin mới')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User cần thêm làm admin')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Xóa admin')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User cần xóa khỏi admin')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Xem danh sách admin')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.user.id !== '945718599824339025') {
            return interaction.reply({
                content: '❌ Chỉ chủ sở hữu bot mới có thể sử dụng lệnh này!',
                flags: 64
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            return handleAddAdmin(interaction);
        } else if (subcommand === 'remove') {
            return handleRemoveAdmin(interaction);
        } else if (subcommand === 'list') {
            return handleListAdmins(interaction);
        }
    }
};

async function handleAddAdmin(interaction) {
    const user = interaction.options.getUser('user');
    const admins = loadAdmins();

    if (admins.admins.includes(user.id)) {
        return interaction.reply({
            content: `⚠️ <@${user.id}> đã là admin rồi!`,
            flags: 64
        });
    }

    admins.admins.push(user.id);
    saveAdmins(admins);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('<a:verify:1461889140248416471> THÊM ADMIN THÀNH CÔNG <a:verify:1461889140248416471>')
        .setDescription(`<@${user.id}> **${user.username}** giờ đã là admin`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleRemoveAdmin(interaction) {
    const user = interaction.options.getUser('user');
    const admins = loadAdmins();

    const index = admins.admins.indexOf(user.id);
    if (index === -1) {
        return interaction.reply({
            content: `⚠️ <@${user.id}> không phải admin!`,
            flags: 64
        });
    }

    if (user.id === '945718599824339025') {
        return interaction.reply({
            content: '❌ Không thể xóa chủ sở hữu bot!',
            flags: 64
        });
    }

    admins.admins.splice(index, 1);
    saveAdmins(admins);

    const embed = new EmbedBuilder()
        .setColor('#ff6600')
        .setTitle('<a:verify:1461889140248416471> XÓA ADMIN THÀNH CÔNG <a:verify:1461889140248416471>')
        .setDescription(`<@${user.id}> **${user.username}** không còn là admin`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleListAdmins(interaction) {
    const admins = loadAdmins();

    if (admins.admins.length === 0) {
        return interaction.reply({
            content: '⚠️ Chưa có admin nào!',
            flags: 64
        });
    }

    const adminList = await Promise.all(
        admins.admins.map(async (adminId) => {
            try {
                const user = await interaction.client.users.fetch(adminId);
                return `👤 <@${adminId}> **${user.username}**`;
            } catch {
                return `👤 <@${adminId}> (User không tồn tại)`;
            }
        })
    );

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🛡️ DANH SÁCH ADMIN')
        .setDescription(adminList.join('\n'))
        .addFields(
            { name: '📊 Tổng Admin', value: `${admins.admins.length}`, inline: true }
        )
        .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: 64 });
}
