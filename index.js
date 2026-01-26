// index.js
const { loadCommands } = require("./commands/loader.js");
const { buttonHandlers, modalHandlers } = require("./events/index.js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// ✅ Import các module đã tách riêng
const { money, shortMoney, safeInt } = require("./helpers/formatting");
const { sleep, timeBar, sideLabel, dieGlyph, rollingTitle, hasLocalDiceGif, cauDot, formatCau } = require("./helpers/utils");
const { loadDB, saveDB, withDB, getUser, getHistory, pushHistory, getPot } = require("./services/database");
const { rollDie, classify, finishRound, finishCLRound, spinOutcome } = require("./game/logic");
const { makeButtons, makeCLButtons, makeSpinRollingEmbed, makeSpinResultEmbed, makeBaccaratDealingEmbed, makeBaccaratResultEmbed } = require("./game/ui");
const { registerCommands } = require("./services/commandRegistry");
const { startFacebookUIDChecker } = require("./services/facebookChecker");
const { startTikTokChecker } = require("./services/tiktokChecker");
const { createFinishRoundWrapper, createFinishCLRoundWrapper } = require("./game/wrappers");
const { buildHelpers, withDeferredEdit } = require("./services/interactionRouter");

// ✅ Import services (Phase 1: Production stability)
const responder = require("./services/interactionResponder");
const logger = require("./services/logger");
const lockService = require("./services/lockService");
const economyService = require("./services/economyService");
const cooldownService = require("./services/cooldownService");

// ============ PROCESS ERROR HANDLERS ============
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[FATAL] Unhandled Rejection', { reason: String(reason), promise: String(promise) });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('[FATAL] Uncaught Exception', { error: err.message, stack: err.stack });
  console.error('Uncaught Exception:', err);
});

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const fs = require("fs");

/** ===================== CONFIG ===================== */
const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID || null;

// ✅ ÉP CỨNG DAILY = 100000 (không phụ thuộc env)
const DAILY_AMOUNT = 100000;

const START_BALANCE = Number.isFinite(Number(process.env.START_BALANCE))
  ? Number(process.env.START_BALANCE)
  : 1000;

const ROUND_SECONDS = Number(process.env.ROUND_SECONDS || 30);
const HISTORY_LIMIT = Number(process.env.HISTORY_LIMIT || 50);
const CAU_SHOW = Number(process.env.CAU_SHOW || 20);
const TX_MIN_BET = Number(process.env.TX_MIN_BET || 100);
const TX_MAX_BET = Number(process.env.TX_MAX_BET || 1000000);

// 🐟 Bầu Cua (nhập số tiền mỗi lượt)
const BC_MIN_BET = Number(process.env.BC_MIN_BET || 10000);
const BC_MAX_BET = Number(process.env.BC_MAX_BET || 1000000);
const BC_ROUND_SECONDS = Number(process.env.BC_ROUND_SECONDS || 30);

// 🎰 Quay hũ (✅ nhập số tiền mỗi lượt, không giới hạn)
const SPIN_MIN = Number(process.env.SPIN_MIN || 100);
const SPIN_MAX = Number(process.env.SPIN_MAX || Infinity);
const SPIN_COOLDOWN_SECONDS = Number(process.env.SPIN_COOLDOWN_SECONDS || 10);
const JACKPOT_TAKE_PCT = Number(process.env.JACKPOT_TAKE_PCT || 30);

// 🟢🔴 Chẵn Lẻ (không giới hạn tiền)
const CL_MIN_BET = Number(process.env.CL_MIN_BET || 100);
const CL_MAX_BET = Number(process.env.CL_MAX_BET || Infinity);

// 🎲 Dice GIF (animated)
const USE_LOCAL_DICE_GIF = process.env.USE_LOCAL_DICE_GIF === "1";
const DICE_GIF_URL =
  process.env.DICE_GIF_URL || "https://media.tenor.com/2roX3uxz_68AAAAC/dice-roll.gif";
const DICE_GIF_PATH = path.join(__dirname, "dice.gif");

// Wrappers cho game logic
const finishRoundWrapper = createFinishRoundWrapper({
  USE_LOCAL_DICE_GIF,
  DICE_GIF_URL,
  hasLocalDiceGif,
  rollingTitle,
  JACKPOT_TAKE_PCT,
  HISTORY_LIMIT,
  START_BALANCE,
  DICE_GIF_PATH,
});

const finishCLRoundWrapper = createFinishCLRoundWrapper({ START_BALANCE });

if (!TOKEN) {
  console.error(":x: Missing TOKEN in .env");
  process.exit(1);
}

/** ===================== CLIENT ===================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ✅ Dynamic command loader
client.commands = new Collection();
const { modules: loadedCommands } = loadCommands(path.join(__dirname, "commands"));
for (const mod of loadedCommands) {
  const name = mod.data?.name || mod.data?.toJSON?.().name;
  if (name) client.commands.set(name, mod);
}

// ✅ Dynamic event loader (nối từ messageCreate)
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js") && file !== "index.js" && !file.includes("interactionCreate"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`✅ Loaded event: ${event.name}`);
}

/** ===================== ROUNDS & COOLDOWNS ===================== */
const rounds = new Map();
let roundSeq = 1;
const spinCooldown = new Map();

// Ensure client exposes live helpers/state AFTER they are defined
client.withDB = withDB;
client.getUser = getUser;
client.getPot = getPot;
client.safeInt = safeInt;
client.shortMoney = shortMoney;
client.money = money;
client.rounds = rounds;
client.TX_MIN_BET = TX_MIN_BET;
client.TX_MAX_BET = TX_MAX_BET;
client.BC_MIN_BET = BC_MIN_BET;
client.BC_MAX_BET = BC_MAX_BET;
client.CL_MIN_BET = CL_MIN_BET;
client.CL_MAX_BET = CL_MAX_BET;
client.SPIN_MIN = SPIN_MIN;
client.SPIN_MAX = SPIN_MAX;
client.SPIN_COOLDOWN_SECONDS = SPIN_COOLDOWN_SECONDS;
client.JACKPOT_TAKE_PCT = JACKPOT_TAKE_PCT;
client.spinCooldown = spinCooldown;
client.spinOutcome = spinOutcome;
client.makeSpinRollingEmbed = makeSpinRollingEmbed;
client.makeSpinResultEmbed = makeSpinResultEmbed;
client.makeBaccaratDealingEmbed = makeBaccaratDealingEmbed;
client.makeBaccaratResultEmbed = makeBaccaratResultEmbed;
client.sleep = sleep;
client.responder = responder;
client.logger = logger;

/** ===================== SLASH COMMANDS ===================== */
// ✅ Build command data from dynamically loaded modules
const commandData = loadedCommands
  .map((m) => (typeof m.data?.toJSON === "function" ? m.data.toJSON() : m.data))
  .filter(Boolean);

/** ===================== READY ===================== */
client.once(Events.ClientReady, async () => {
  await registerCommands(client, commandData, GUILD_ID);
  console.log("🤖 Bot đã sẵn sàng!");
  
  // Bắt đầu background checker để theo dõi UID
  startFacebookUIDChecker(client);
  startTikTokChecker(client);
});

/** ===================== GUILD CREATE (Bot được add vào server mới) ===================== */
client.on(Events.GuildCreate, async (guild) => {
  try {
    console.log(`🎉 Bot được thêm vào server mới: ${guild.name} (${guild.id})`);
    console.log(`📝 Đang đăng ký commands cho ${guild.name}...`);
    
    await guild.commands.set(commandData);
    console.log(`✅ Commands đã được đăng ký cho ${guild.name}!`);
    
    // Gửi thông báo chào mừng (tìm channel có quyền gửi tin nhắn)
    const channel = guild.channels.cache.find(
      ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages')
    );
    
    if (channel) {
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('👋 Xin chào! Cảm ơn đã add bot!')
        .setDescription('Bot đã sẵn sàng sử dụng!\n\nSử dụng lệnh `/menu` để xem danh sách lệnh\nHoặc `/hdsd` để xem hướng dẫn chi tiết!')
        .addFields(
          { name: '💰 Lệnh tiền tệ', value: '`/balance`, `/daily`, `/top`, `/give`', inline: true },
          { name: '🎮 Mini Games', value: '`/taixiu`, `/baucua`, `/quayhu`, `/jackpot`', inline: true },
          { name: '🛠️ Quản lý', value: '`/setmoney`, `/add`, `/list`, `/delete`', inline: true },
          { name: '🏗️ Xây dựng server', value: '`/buildserver` - Tự động tạo cấu trúc server!', inline: false }
        )
        .setFooter({ text: 'Chúc bạn sử dụng vui vẻ!' })
        .setTimestamp();
      
      await channel.send({ embeds: [welcomeEmbed] });
    }

    // Gửi thông báo cho chủ sở hữu bot
    try {
      const owner = await client.users.fetch('945718599824339025');
      const notifyEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('✅ BOT ĐƯỢC ADD VÀO SERVER MỚI')
        .setDescription(`Bot vừa được add vào một server mới!`)
        .addFields(
          { name: '📛 Server Name', value: `**${guild.name}**`, inline: false },
          { name: '🆔 Server ID', value: `\`${guild.id}\``, inline: false },
          { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
          { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: '🌍 Region', value: guild.preferredLocale || 'N/A', inline: true }
        )
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: `Tổng server hiện tại: ${client.guilds.cache.size}` })
        .setTimestamp();
      
      await owner.send({ embeds: [notifyEmbed] });
      console.log(`📧 Đã thông báo tới chủ sở hữu về server mới: ${guild.name}`);
    } catch (error) {
      console.error('❌ Không thể gửi thông báo tới chủ sở hữu:', error);
    }
  } catch (error) {
    console.error(`❌ Lỗi khi đăng ký commands cho guild ${guild.id}:`, error);
  }
});

/** ===================== INTERACTIONS ===================== */
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    /** ---------- SLASH ---------- */
    if (interaction.isChatInputCommand()) {
      // ✅ FIX: nếu command nằm trong folder (ping) thì chạy luôn
      const cmd = client.commands.get(interaction.commandName);
      if (cmd) {
        console.log(`🎮 Command "${interaction.commandName}" executed by ${interaction.user.username}`);

        const helpers = {
          ...buildHelpers(client),
          DAILY_AMOUNT,
          ROUND_SECONDS,
          BC_ROUND_SECONDS,
          CAU_SHOW,
          formatCau,
          timeBar,
          makeButtons,
          makeCLButtons,
          finishRound: finishRoundWrapper,
          finishCLRound: finishCLRoundWrapper,
          getHistory,
        };

        await cmd.execute(interaction, helpers);
        return;
      }
    }

    /** ---------- BUTTONS ---------- */
    if (interaction.isButton?.()) {
      const helpers = {
        ...buildHelpers(client),
        ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
      };
      for (const handler of buttonHandlers) {
        try {
          // Check if handler has customIdPrefix filter
          if (handler.customIdPrefix && !interaction.customId.startsWith(handler.customIdPrefix)) {
            continue;
          }
          await handler.handle(interaction, helpers);
          // Only stop if the handler actually responded
          if (interaction.replied || interaction.deferred) return;
        } catch (err) {
          console.error("Button handler error:", err);
        }
      }
    }

    /** ---------- MODAL SUBMIT ---------- */
    if (interaction.isModalSubmit?.()) {
      for (const handler of modalHandlers) {
        if (handler.customIdPrefix && interaction.customId.startsWith(handler.customIdPrefix)) {
          try {
            const helpers = {
              ...buildHelpers(client),
              EmbedBuilder,
              ModalBuilder,
              ActionRowBuilder,
            };
            await withDeferredEdit(interaction, async () => {
              await handler.handle(interaction, helpers);
            });
            return;
          } catch (err) {
            console.error("Modal handler error:", err);
            return;
          }
        }
      }
    }
  } catch (e) {
    console.error(":x: InteractionCreate error:", e);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: ":x: Có lỗi xảy ra khi xử lý.", ephemeral: true });
      }
    } catch {}
  }
});

/** ===================== START ===================== */
client.login(TOKEN).catch((e) => {
  console.error(":x: Login error:", e);
  process.exit(1);
});