const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

// Map lưu trạng thái nối từ cho mỗi server
const noituStatus = new Map();
// Map lưu trạng thái game đang chơi: channelId -> { lastWord, usedWords: Set(), startWord }
const activeGames = new Map();

// Danh sách từ bắt đầu random
const startWords = ["con vịt", "cái bàn", "quả táo", "con mèo", "chiếc xe", "cây cối", "ngôi nhà", "bông hoa", "con chó", "quả bóng"];

// Hàm lấy âm cuối tiếng Việt
function getLastSyllable(word) {
  const trimmed = word.trim().toLowerCase();
  const syllables = trimmed.split(/\s+/);
  return syllables[syllables.length - 1];
}

// Hàm kiểm tra 2 từ có nối được không
function canConnect(word1, word2) {
  const lastSyl1 = getLastSyllable(word1);
  const firstSyl2 = getLastSyllable(word2.split(/\s+/)[0]);
  return lastSyl1 === firstSyl2;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("noitu")
    .setDescription("Bật/tắt tính năng nối từ trong server")
    .addSubcommand(subcommand =>
      subcommand
        .setName("on")
        .setDescription("Bật tính năng nối từ và bắt đầu game")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("off")
        .setDescription("Tắt tính năng nối từ và dừng game")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("status")
        .setDescription("Kiểm tra trạng thái nối từ")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    
    if (!guildId) {
      return interaction.reply({ content: ":x: Lệnh này chỉ dùng trong server.", ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "on") {
      noituStatus.set(guildId, true);
      
      // Random từ bắt đầu
      const startWord = startWords[Math.floor(Math.random() * startWords.length)];
      
      // Khởi tạo game mới
      activeGames.set(channelId, {
        lastWord: startWord,
        usedWords: new Set([startWord.toLowerCase()]),
        startWord: startWord
      });
      
      return interaction.reply({
        content: `✅ **Đã bật game nối từ!**\n\n🎮 **Từ bắt đầu:** **${startWord}**\n📝 **Quy tắc:** Nối từ theo âm cuối tiếng Việt, không lặp lại từ đã dùng!\n\n👉 Hãy gõ từ tiếp theo vào chat!`,
        ephemeral: false
      });
    }

    if (subcommand === "off") {
      noituStatus.set(guildId, false);
      activeGames.delete(channelId);
      
      return interaction.reply({
        content: "❌ **Đã tắt game nối từ!**\n🚫 Game đã kết thúc.",
        ephemeral: false
      });
    }

    if (subcommand === "status") {
      const isEnabled = noituStatus.get(guildId) || false;
      const game = activeGames.get(channelId);
      
      let statusText = `📊 **Trạng thái nối từ:** ${isEnabled ? "✅ Đang BẬT" : "❌ Đang TẮT"}`;
      
      if (game) {
        statusText += `\n\n🎮 **Game đang chơi:**\n📝 Từ hiện tại: **${game.lastWord}**\n🔢 Số từ đã dùng: **${game.usedWords.size}**`;
      }
      
      return interaction.reply({
        content: statusText,
        ephemeral: true
      });
    }
  },

  // Export functions
  isEnabled(guildId) {
    return noituStatus.get(guildId) || false;
  },
  
  getGame(channelId) {
    return activeGames.get(channelId);
  },
  
  updateGame(channelId, newWord) {
    const game = activeGames.get(channelId);
    if (!game) return false;
    
    game.lastWord = newWord;
    game.usedWords.add(newWord.toLowerCase());
    return true;
  },
  
  getLastSyllable,
  canConnect
};
