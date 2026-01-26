const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Emoji động
const ANIMALS = {
  1: { name: 'Bầu', emoji: '<a:bau:7443649440313_3cabce40d4aaadcb>' },
  2: { name: 'Cua', emoji: '<a:cua:7443649361817_06d639ced2268ef6>' },
  3: { name: 'Cá', emoji: '<a:ca:7443649355571_b7f7a5eff3d74af40>' },
  4: { name: 'Gà', emoji: '<a:ga:7443649355340_4284c593d49294e7b>' },
  5: { name: 'Nai', emoji: '<a:nai:7443649351111_91f01656f8abcb1bc>' },
  6: { name: 'Tôm', emoji: '<a:tom:7443649338836_0d92b75c8e6486d2e>' },
};

const rounds = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('baucua')
    .setDescription('Chơi Bầu Cua cực chill!'),

  rounds,
  ANIMALS,

  async execute(interaction, { withDB, getUser, shortMoney }) {
    if (!interaction.guildId) {
      return interaction.reply({ content: ':x: Lệnh này chỉ dùng trong server.', ephemeral: true });
    }

    await interaction.deferReply();
    const channelId = interaction.channelId;

    // Kiểm tra nếu đã có game trong channel này
    if (rounds.has(channelId)) {
      return interaction.editReply({ content: '❌ Đã có game Bầu Cua đang chạy trong channel này!' });
    }

    rounds.set(channelId, { bets: new Map(), startedAt: Date.now() });
    let remain = 30;

    const updateEmbed = async (disableAll = false) => {
      const round = rounds.get(channelId);
      const betUsers = round ? Array.from(round.bets.values()).map(b => `${ANIMALS[b.animalId].emoji} <@${b.userId}>`) : [];
      const bar = '🟨'.repeat(30 - remain) + '⬜'.repeat(remain);

      const embed = new EmbedBuilder()
        .setTitle('🎲 BẦU CUA — ĐẶT CƯỢC')
        .setColor(0xFF1744)
        .setDescription([
          '🔴 **Thời gian: 30s để đặt**',
          '',
          '**6 Con Vật:**',
          Object.values(ANIMALS).map(a => a.emoji + ' ' + a.name).join(' | '),
          '',
          '**Luật:**',
          '• Mỗi con trúng: Ăn 1:1',
          '• 2 con trúng: Ăn 1:2',
          '• 3 con trúng: Ăn 1:3',
          '',
          'Bấm nút con vật để đặt cược!',
          '',
          `⏳ **Còn lại:** ${remain}s`,
          bar,
          '',
          '🟦 **Đã đặt**',
          betUsers.length ? betUsers.join(' | ') : '0 người',
          'ID: BC1'
        ].join('\n'));

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bc_bal').setLabel('💰 Số dư').setStyle(ButtonStyle.Secondary).setDisabled(disableAll),
        ...Array.from({length: 4}, (_, i) => 
          new ButtonBuilder()
            .setCustomId(`bc_bet_${i + 1}`)
            .setLabel(ANIMALS[i + 1].emoji + ' ' + ANIMALS[i + 1].name)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disableAll)
        )
      );

      const row2 = new ActionRowBuilder().addComponents(
        ...Array.from({length: 2}, (_, i) => 
          new ButtonBuilder()
            .setCustomId(`bc_bet_${i + 5}`)
            .setLabel(ANIMALS[i + 5].emoji + ' ' + ANIMALS[i + 5].name)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disableAll)
        )
      );

      await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    };

    await updateEmbed();

    const timer = setInterval(async () => {
      remain--;

      if (remain <= 0) {
        clearInterval(timer);

        // Hết giờ: show embed lắc xúc xắc
        const animEmbed = new EmbedBuilder()
          .setTitle('⚠️ HẾT GIỜ ĐẶT CƯỢC ⚠️')
          .setColor(0xFFA500)
          .setDescription([
            '<a:47245redsiren:1462441165818171624> ĐANG LẮC BẦU CUA <a:47245redsiren:1462441165818171624>',
            '',
            '🎲 **XÚC XẮC:**',
            '[?] - [?] - [?]',
            '(Đang lắc...)',
            '⏳ Vui lòng chờ kết quả...',
            'ID: BC1 | Đang xử lý...'
          ].join('\n'));

        await interaction.editReply({ embeds: [animEmbed], components: [] });

        // Xử lý kết quả sau 2s
        setTimeout(async () => {
          const result = [
            1 + Math.floor(Math.random() * 6),
            1 + Math.floor(Math.random() * 6),
            1 + Math.floor(Math.random() * 6)
          ];

          const resultEmbed = new EmbedBuilder()
            .setTitle('<a:47245redsiren:1462441165818171624> BẦU CUA — KẾT QUẢ <a:47245redsiren:1462441165818171624>')
            .setColor(0x00C853)
            .setDescription([
              `🎲 **XÚC XẮC RA:** ${result.map(i => ANIMALS[i].emoji).join(' - ')}`,
              '',
              '🏆 **TỔNG KẾT**',
              '──────────────────────────────',
              'Tính toán thắng thua ở đây...',
              '',
              `ID: BC1 | Kết thúc • ${new Date().toLocaleTimeString('vi-VN')}`
            ].join('\n'));

          await interaction.editReply({ embeds: [resultEmbed], components: [] });
          rounds.delete(channelId);
        }, 2000);
        return;
      }

      await updateEmbed();
    }, 1000);
  },
};