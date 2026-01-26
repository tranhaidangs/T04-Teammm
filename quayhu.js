const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quayhu")
    .setDescription("Quay hũ may mắn (nhập số tiền)"),

  async execute(interaction, { shortMoney, SPIN_MIN }) {
    if (!interaction.guildId) {
      return interaction.reply({ content: ":x: Lệnh này chỉ dùng trong server." });
    }

    const modal = new ModalBuilder().setCustomId("SPIN_MODAL").setTitle("🎰 QUAY HŨ MAY MẮN 🎰");

    const input = new TextInputBuilder()
      .setCustomId("spin_amount")
      .setLabel(`Nhập tiền quay (min ${shortMoney(SPIN_MIN)})`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("VD: 1000 hoặc 5k, 1.5m, 2b")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(12);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    
    try {
      await interaction.showModal(modal);
    } catch (err) {
      console.error("❌ Error showing SPIN modal:", err);
      try {
        await interaction.reply({ content: ":x: Có lỗi khi mở form. Vui lòng thử lại." });
      } catch {}
    }
    return;
  },

  // Modal handler - sẽ được gọi từ events/index.js
  customIdPrefix: "SPIN_MODAL",
  async handleModal(interaction, { withDB, getUser, getPot, safeInt, shortMoney, SPIN_MIN, SPIN_COOLDOWN_SECONDS, JACKPOT_TAKE_PCT, spinOutcome, makeSpinRollingEmbed, makeSpinResultEmbed, sleep, spinCooldown, responder, logger }) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    
    try {
      logger.info(`[Quayhu] Modal handler start: userId=${userId}, guildId=${guildId}`);
      const amountStr = interaction.fields.getTextInputValue("spin_amount");
      logger.info(`[Quayhu] amountStr=${amountStr}`);
      const amount = safeInt(amountStr);
      logger.info(`[Quayhu] amount=${amount}`);
      if (!guildId) {
        logger.error(`[Quayhu] No guildId!`);
        await responder.safeReply(interaction, { content: ":x: Lệnh này chỉ dùng trong server.", ephemeral: true });
        return;
      }
      if (!Number.isFinite(amount) || amount < SPIN_MIN) {
        logger.error(`[Quayhu] Invalid amount: ${amount}`);
        await responder.safeReply(interaction, {
          content: `:x: Số tiền không hợp lệ hoặc phải >= ${shortMoney(SPIN_MIN)}.`,
          ephemeral: true,
        });
        return;
      }
      const lastSpin = spinCooldown.get(userId) || 0;
      const now = Date.now();
      logger.info(`[Quayhu] lastSpin=${lastSpin}, now=${now}`);
      if (now - lastSpin < SPIN_COOLDOWN_SECONDS * 1000) {
        const left = Math.ceil((SPIN_COOLDOWN_SECONDS * 1000 - (now - lastSpin)) / 1000);
        logger.warn(`[Quayhu] Cooldown: left=${left}`);
        await responder.safeReply(interaction, { content: `:hourglass: Vui lòng đợi ${left}s trước khi quay tiếp.`, ephemeral: true });
        return;
      }
      spinCooldown.set(userId, now);
      logger.info(`[Quayhu] Start spin: userId=${userId}, guildId=${guildId}, amount=${amount}`);
      const res = await withDB(async (db) => {
        logger.info(`[Quayhu] withDB start`);
        const u = getUser(db, userId);
        logger.info(`[Quayhu] user balance=${u.balance}`);
        const pot = getPot(db, guildId);
        logger.info(`[Quayhu] pot quayhuJackpot=${pot.quayhuJackpot}`);
        if (u.balance < amount) {
          logger.warn(`[Quayhu] Not enough balance: userId=${userId}, balance=${u.balance}, amount=${amount}`);
          return { ok: false, reason: "not_enough", balance: u.balance };
        }
        // Tạo ma trận 3x3 symbols ngẫu nhiên, đủ tất cả icon quay hũ
        const allSymbols = ["💜", "🌟", "💫", "🍑", "💰", "7️⃣"];
        function shuffle(array) {
          for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
          }
          return array;
        }
        const symbols = shuffle([...allSymbols, ...allSymbols, ...allSymbols]).slice(0, 9);
        // Format kết quả cuối cùng: mỗi emoji cách nhau 2 dấu cách, hiển thị trong ô màu đen
        const gridDisplay = `${symbols[0]}  ${symbols[1]}  ${symbols[2]}\n${symbols[3]}  ${symbols[4]}  ${symbols[5]}\n${symbols[6]}  ${symbols[7]}  ${symbols[8]}`;
        res.gridDisplay = `\u0060\u0060\u0060\n${gridDisplay}\n\u0060\u0060\u0060`;
        logger.info(`[Quayhu] Generated symbols: ${JSON.stringify(symbols)}`);
        const jackpotBefore = pot.quayhuJackpot;
        u.balance -= amount;
        pot.quayhuJackpot += Math.floor((amount * JACKPOT_TAKE_PCT) / 100);
        logger.info(`[Quayhu] jackpotBefore=${jackpotBefore}, jackpotAfter=${pot.quayhuJackpot}`);
        // Truyền symbols vào spinOutcome để kiểm tra
        const outcome = spinOutcome(amount, pot.quayhuJackpot, symbols);
        logger.info(`[Quayhu] Outcome: ${JSON.stringify(outcome)}`);
        u.balance += outcome.payout;
        if (outcome.type === "JACKPOT") {
          pot.quayhuJackpot = 0;
          logger.info(`[Quayhu] Quay Hũ Jackpot reset to 0`);
        }
        return {
          ok: true,
          cost: amount,
          outcome,
          symbols,
          jackpotBefore,
          jackpotAfter: pot.quayhuJackpot,
          balanceAfter: u.balance,
        };
      });
      logger.info(`[Quayhu] Spin result: ${JSON.stringify(res)}`);
      if (!res.ok) {
        logger.warn(`[Quayhu] Spin failed: ${JSON.stringify(res)}`);
        await responder.safeReply(interaction, { content: ":x: Bạn không đủ tiền để quay.", ephemeral: true });
        return;
      }

      // 🎰 Hiệu ứng quay - update frame liên tục
      const spinFrames = 15;
      const frameDuration = 80;
      
      for (let frame = 0; frame < spinFrames; frame++) {
        const edit = await responder.safeEdit(interaction, {
          embeds: [
            makeSpinRollingEmbed({
              userId,
              amount,
              jackpot: res.jackpotBefore,
              frame: frame,
            }),
          ],
        });
        if (!edit.ok) {
          logger.warn(`[Quayhu] Frame ${frame} edit skipped: ${edit.error}`, { userId });
        }
        await sleep(frameDuration);
      }

      await sleep(500);

      const finalEdit = await responder.safeEdit(interaction, {
        embeds: [
          makeSpinResultEmbed({
            user: interaction.user,
            cost: res.cost,
            outcome: res.outcome,
            symbols: res.symbols,
            jackpotBefore: res.jackpotBefore,
            jackpotAfter: res.jackpotAfter,
            balanceAfter: res.balanceAfter,
          }),
        ],
      });

      if (!finalEdit.ok) {
        logger.error(`[Quayhu] Final result edit failed: ${finalEdit.error}`, { userId });
      }
    } catch (err) {
      // Log lỗi chi tiết ra console để chắc chắn hiển thị trên terminal
      console.error('[Quayhu] Handler error:', err);
      logger.error(`[Quayhu] Handler error: ${err.message}`);
      await responder.safeReply(interaction, { content: "❌ Lỗi xử lý quay hũ.", ephemeral: true });
    }
  },
};