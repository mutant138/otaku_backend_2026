import { User } from "../Models/index.js";
import { BOT_PERSONAS, getOrCreateBotUser } from "./duelManager.js";

// In-memory active matchmaking queue for Word Cipher Duel
// { socketId, userId, gender, user, joinedAt, botFallbackTimer }
const wordMatchmakingQueue = [];

// In-memory active word duel rooms
// roomId -> RoomState
const activeWordRooms = new Map();

// Pending match acceptance rooms
// roomId -> { player1, player2, expiresAt, acceptanceTimer, player1Accepted, player2Accepted }
const pendingWordMatches = new Map();

/**
 * Curated Pool of Anime & Gaming Secret Words (4 - 8 letters)
 */
export const ANIME_GAME_WORDS = [
  // 4 letters
  "GOKU", "ZORO", "NAMI", "LUKE", "DOOM", "HALO", "APEX", "SOUL", "MAGE", "LEVI",
  "SORA", "NEON", "CHAD", "REMU", "RYUK", "JINX", "LINK", "EDEN", "MECH", "FIRE",
  "CLAN", "HERO", "MARS", "NOVA", "SEGA", "SONY", "BOSS", "LOOT", "MANA", "ZODD",
  // 5 letters
  "TITAN", "ZELDA", "LUFFY", "ANIME", "MANGA", "CHIBI", "MECHA", "OTAKU", "NINJA",
  "KANJI", "SUSHI", "TOKYO", "BLADE", "SWORD", "MAGIC", "POWER", "SPEED", "ARMOR",
  "DEMON", "GHOST", "BEAST", "PIXEL", "VALOR", "QUEST", "RELIC", "ROGUE", "DEATH",
  "CYBER", "FINAL", "FORCE", "SUPER", "GUILD", "SONIC", "CLOUD", "SEPHI", "SAIYA",
  // 6 letters
  "BANKAI", "NARUTO", "SASUKE", "ITACHI", "SHADOW", "CHAKRA", "HUNTER", "ESPADA",
  "HOLLOW", "DOMAIN", "BLEACH", "SPIRIT", "DRAGON", "AVATAR", "WIZARD", "KNIGHT",
  "GHOULS", "KAIJUS", "SHIELD", "LEGEND", "ATTACK", "VALLEY", "SHONEN", "MAKIMA",
  "DENJIS", "SUKUNA", "MADARA", "KAKASH",
  // 7 letters
  "SAITAMA", "SHINOBI", "PERSONA", "WITCHER", "GENSHIN", "SLAYERS", "MONSTER",
  "PHOENIX", "WARLOCK", "CYBERPU", "TITANIC", "HOLLOWS", "ARCHERS", "PALADIN",
  "ALBEDOS", "MINATOS", "JUTSUUS", "POKEMON",
  // 8 letters
  "BERSERK", "OVERLORD", "SHINIGAM", "ALCHEMIS", "PLATINUM", "ASSASSIN",
  "WARRIORS", "INFINITY", "TSUKUYOM", "VALKYRIE"
];

/**
 * Letter Evaluation Algorithm
 * - 'green': Letter matches character AND exact position
 * - 'yellow': Letter is in the secret word, but in a different position
 * - 'red': Letter is NOT in the secret word
 */
export function evaluateWordGuess(guess, secret) {
  const g = guess.toUpperCase().trim();
  const s = secret.toUpperCase().trim();
  const len = s.length;
  const result = new Array(len).fill("red");
  const secretCounts = {};

  // 1. Count letter frequencies in the secret word
  for (let i = 0; i < len; i++) {
    const ch = s[i];
    secretCounts[ch] = (secretCounts[ch] || 0) + 1;
  }

  // 2. First Pass: Exact matches (Green)
  for (let i = 0; i < len; i++) {
    if (g[i] === s[i]) {
      result[i] = "green";
      secretCounts[g[i]]--;
    }
  }

  // 3. Second Pass: Wrong position matches (Yellow)
  for (let i = 0; i < len; i++) {
    if (result[i] !== "green") {
      const ch = g[i];
      if (secretCounts[ch] && secretCounts[ch] > 0) {
        result[i] = "yellow";
        secretCounts[ch]--;
      } else {
        result[i] = "red";
      }
    }
  }

  return result;
}

/**
 * Remove user from word duel queue
 */
function removeWordFromQueue(userId) {
  const idx = wordMatchmakingQueue.findIndex((entry) => entry.userId === userId.toString());
  if (idx !== -1) {
    const [entry] = wordMatchmakingQueue.splice(idx, 1);
    if (entry && entry.botFallbackTimer) {
      clearTimeout(entry.botFallbackTimer);
      entry.botFallbackTimer = null;
    }
  }
}

/**
 * Initialize Word Duel Socket Handlers
 */
export function initWordDuelSocketHandlers(io, socket) {
  const userId = socket.userId;

  // ─── 1. JOIN MATCHMAKING QUEUE (Single Button Entry) ───
  socket.on("word_join_queue", async (data = {}) => {
    try {
      if (!userId) {
        return socket.emit("word_error", { message: "Authentication required." });
      }

      removeWordFromQueue(userId);

      const userDoc = await User.findById(userId)
        .select("username profilePics preferences activeSubscription isPremium gender synergy")
        .lean();

      if (!userDoc) {
        return socket.emit("word_error", { message: "User profile not found." });
      }

      console.log(`[Word Duel Queue] User ${userDoc.username} (${userId}) joined queue.`);

      const queueEntry = {
        socketId: socket.id,
        userId: userId.toString(),
        gender: userDoc.gender || "male",
        user: {
          _id: userDoc._id,
          username: userDoc.username,
          avatar: userDoc.profilePics?.[0] || "",
          synergy: userDoc.synergy || 0,
        },
        joinedAt: Date.now(),
        botFallbackTimer: null,
      };

      // Check for available human opponent in queue
      const opponentIndex = wordMatchmakingQueue.findIndex(
        (entry) => entry.userId !== userId.toString()
      );

      if (opponentIndex !== -1) {
        const opponent = wordMatchmakingQueue.splice(opponentIndex, 1)[0];
        if (opponent.botFallbackTimer) {
          clearTimeout(opponent.botFallbackTimer);
          opponent.botFallbackTimer = null;
        }
        createWordMatchFoundPrompt(io, queueEntry, opponent);
      } else {
        // Fallback to AI Rival bot after 8 seconds
        queueEntry.botFallbackTimer = setTimeout(async () => {
          try {
            const idx = wordMatchmakingQueue.findIndex((entry) => entry.userId === userId.toString());
            if (idx === -1) return;

            const [playerEntry] = wordMatchmakingQueue.splice(idx, 1);
            playerEntry.botFallbackTimer = null;

            const userGenderLower = (playerEntry.gender || "male").toLowerCase();
            const targetBotGender =
              userGenderLower.includes("female") ||
              userGenderLower.includes("girl") ||
              userGenderLower.includes("woman")
                ? "male"
                : "female";

            const botUser = await getOrCreateBotUser(targetBotGender, playerEntry.user, playerEntry.userId);
            const botQueueEntry = {
              socketId: null,
              userId: botUser._id.toString(),
              isBot: true,
              user: {
                _id: botUser._id,
                username: botUser.username,
                avatar: botUser.profilePics?.[0] || botUser.avatar || "",
                synergy: botUser.synergy || 120,
              },
              joinedAt: Date.now(),
            };

            console.log(
              `[Word Duel Bot Fallback] 8s reached. Pairing ${playerEntry.user.username} with AI Rival ${botQueueEntry.user.username}`
            );
            createWordMatchFoundPrompt(io, playerEntry, botQueueEntry);
          } catch (botErr) {
            console.error("[Word Duel Bot Fallback Error]:", botErr);
          }
        }, 8000);

        wordMatchmakingQueue.push(queueEntry);
        socket.emit("word_queue_status", { status: "searching", position: wordMatchmakingQueue.length });
      }
    } catch (err) {
      console.error("[Word Duel Queue Error]:", err);
      socket.emit("word_error", { message: "Failed to join word duel queue." });
    }
  });

  // ─── 2. LEAVE QUEUE ───
  socket.on("word_leave_queue", () => {
    removeWordFromQueue(userId);
    socket.emit("word_queue_status", { status: "idle" });
  });

  // ─── 3. ACCEPT MATCH (10s Window) ───
  socket.on("word_accept_match", async ({ roomId }) => {
    const pending = pendingWordMatches.get(roomId);
    if (!pending) {
      return socket.emit("word_error", { message: "Match expired or not found." });
    }

    if (pending.player1.userId === userId.toString()) {
      pending.player1Accepted = true;
    } else if (pending.player2.userId === userId.toString()) {
      pending.player2Accepted = true;
    }

    io.to(roomId).emit("word_match_acceptance_update", {
      player1Accepted: pending.player1Accepted,
      player2Accepted: pending.player2Accepted,
    });

    if (pending.player1Accepted && pending.player2Accepted) {
      clearTimeout(pending.acceptanceTimer);
      pendingWordMatches.delete(roomId);
      // Trigger 5-second live role selection phase!
      startWordRoleSelectionPhase(io, roomId, pending.player1, pending.player2);
    }
  });

  // ─── 4. DECLINE MATCH ───
  socket.on("word_decline_match", ({ roomId }) => {
    const pending = pendingWordMatches.get(roomId);
    if (!pending) return;

    clearTimeout(pending.acceptanceTimer);
    pendingWordMatches.delete(roomId);

    io.to(roomId).emit("word_match_declined", {
      message: "Match was declined by one of the duelists.",
    });

    const otherPlayer =
      pending.player1.userId === userId.toString() ? pending.player2 : pending.player1;

    if (otherPlayer && otherPlayer.socketId) {
      io.to(otherPlayer.socketId).emit("word_queue_status", {
        status: "opponent_declined",
        message: "Your opponent declined. Re-queued for a new challenger.",
      });
    }
  });

  // ─── 5. ROLE SELECTION (5s Window: First to click claims role, other gets opposite) ───
  socket.on("word_choose_role", ({ roomId, chosenRole }) => {
    const room = activeWordRooms.get(roomId);
    if (!room || room.status !== "role_selection") return;

    // Clear 5s timeout
    if (room.roleTimer) {
      clearTimeout(room.roleTimer);
      room.roleTimer = null;
    }

    const isPlayer1 = room.player1.userId === socket.userId;
    const isPlayer2 = room.player2.userId === socket.userId;
    if (!isPlayer1 && !isPlayer2) return;

    const choosingPlayer = isPlayer1 ? room.player1 : room.player2;
    const otherPlayer = isPlayer1 ? room.player2 : room.player1;

    let setterUserId, guesserUserId;
    if (chosenRole === "setter") {
      setterUserId = choosingPlayer.userId;
      guesserUserId = otherPlayer.userId;
    } else {
      setterUserId = otherPlayer.userId;
      guesserUserId = choosingPlayer.userId;
    }

    console.log(
      `[Word Duel Role Selected] ${choosingPlayer.username} clicked "${chosenRole}". Other player ${otherPlayer.username} gets opposite.`
    );

    assignRolesAndStartGame(
      io,
      roomId,
      setterUserId,
      guesserUserId,
      choosingPlayer.username,
      chosenRole
    );
  });

  // ─── 6. CIPHER MASTER SETS SECRET WORD ───
  socket.on("word_set_secret", ({ roomId, secretWord }) => {
    const room = activeWordRooms.get(roomId);
    if (!room || room.status !== "setting_secret") {
      return socket.emit("word_error", { message: "Cannot set secret word at this time." });
    }

    if (socket.userId !== room.setterUserId) {
      return socket.emit("word_error", { message: "Only the Cipher Master can set the secret word." });
    }

    const cleanWord = (secretWord || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (cleanWord.length < 4 || cleanWord.length > 8) {
      return socket.emit("word_error", {
        message: "Secret word must be between 4 and 8 English alphabetic letters.",
      });
    }

    room.secretWord = cleanWord;

    const setter = room.player1.userId === room.setterUserId ? room.player1 : room.player2;
    const guesser = room.player1.userId === room.guesserUserId ? room.player1 : room.player2;

    // Guesser receives notification of word length (zero letters revealed!)
    if (guesser.socketId) {
      io.to(guesser.socketId).emit("word_secret_ready", {
        roomId,
        setterUsername: setter.username,
        wordLength: cleanWord.length,
      });
    }

    // Notify setter that their word is locked
    socket.emit("word_secret_confirmed", {
      roomId,
      wordLength: cleanWord.length,
      secretWord: cleanWord,
    });

    // Both players proceed to guessing phase
    checkAndStartGuessingPhase(io, roomId);
  });

  // ─── 7. LIVE TYPING TELEMETRY STREAM (Guesser ➔ Setter) ───
  socket.on("word_typing_update", ({ roomId, currentInput }) => {
    const room = activeWordRooms.get(roomId);
    if (!room || room.status !== "guessing") return;

    // Stream typed letters to everyone else in the room (specifically the Setter)
    socket.to(roomId).emit("word_opponent_typing", {
      roomId,
      currentInput: (currentInput || "").toUpperCase(),
      guesserUserId: socket.userId,
    });
  });

  // ─── 8. GUESS SUBMISSION (Guesser Only — 8 Chances) ───
  socket.on("word_submit_guess", async ({ roomId, guess }) => {
    const room = activeWordRooms.get(roomId);
    if (!room || room.status !== "guessing") {
      return socket.emit("word_error", { message: "Not in active guessing phase." });
    }

    if (socket.userId !== room.guesserUserId) {
      return socket.emit("word_error", { message: "Only the Cipher Breaker can enter guesses." });
    }

    const secretWord = room.secretWord;
    if (!secretWord) {
      return socket.emit("word_error", { message: "Opponent has not finished sealing the secret word." });
    }

    const guesser = room.player1.userId === room.guesserUserId ? room.player1 : room.player2;
    if (guesser.chancesUsed >= 8 || guesser.isSolved) {
      return socket.emit("word_error", { message: "No chances remaining or cipher already cracked." });
    }

    const cleanGuess = (guess || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (cleanGuess.length !== secretWord.length) {
      return socket.emit("word_error", {
        message: `Guess must have exactly ${secretWord.length} letters.`,
      });
    }

    executeWordGuess(io, room, cleanGuess);
  });

  // ─── 9. REMATCH REQUEST ───
  socket.on("word_rematch", ({ roomId }) => {
    const room = activeWordRooms.get(roomId);
    if (!room) return;

    if (room.player2.isBot) {
      activeWordRooms.delete(roomId);
      startWordRoleSelectionPhase(
        io,
        roomId,
        { userId: room.player1.userId, user: room.player1, socketId: socket.id },
        { userId: room.player2.userId, user: room.player2, isBot: true, socketId: null }
      );
    } else {
      io.to(roomId).emit("word_rematch_requested", {
        fromUsername: socket.userId === room.player1.userId ? room.player1.username : room.player2.username,
      });
    }
  });

  // ─── 10. DISCONNECT ───
  socket.on("disconnect", () => {
    removeWordFromQueue(userId);

    // Clean up pending matches
    for (const [roomId, pending] of pendingWordMatches.entries()) {
      if (pending.player1.userId === userId.toString() || pending.player2.userId === userId.toString()) {
        clearTimeout(pending.acceptanceTimer);
        pendingWordMatches.delete(roomId);
        io.to(roomId).emit("word_match_declined", {
          message: "A duelist disconnected during calibration.",
        });
      }
    }

    // Handle active room disconnect
    for (const [roomId, room] of activeWordRooms.entries()) {
      if (room.player1.userId === userId.toString() || room.player2.userId === userId.toString()) {
        const remainingPlayer =
          room.player1.userId === userId.toString() ? room.player2 : room.player1;

        if (room.roleTimer) clearTimeout(room.roleTimer);
        if (room.botGuessTimer) clearTimeout(room.botGuessTimer);
        if (room.botSetTimer) clearTimeout(room.botSetTimer);

        io.to(roomId).emit("word_opponent_disconnected", {
          winnerId: remainingPlayer.userId,
          message: "Opponent disconnected from word cipher duel.",
        });

        activeWordRooms.delete(roomId);
      }
    }
  });
}

/**
 * Create Match Found Prompt (10s Acceptance Window)
 */
function createWordMatchFoundPrompt(io, player1, player2) {
  const roomId = `word_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const socket1 = player1.socketId ? io.sockets.sockets.get(player1.socketId) : null;
  const socket2 = player2.socketId ? io.sockets.sockets.get(player2.socketId) : null;

  if (socket1) socket1.join(roomId);
  if (socket2) socket2.join(roomId);

  const pending = {
    roomId,
    player1,
    player2,
    player1Accepted: false,
    player2Accepted: false,
    expiresAt: Date.now() + 10000,
    acceptanceTimer: null,
  };

  pending.acceptanceTimer = setTimeout(() => {
    pendingWordMatches.delete(roomId);
    io.to(roomId).emit("word_match_expired", {
      message: "Acceptance countdown expired. Match cancelled.",
    });
  }, 10000);

  pendingWordMatches.set(roomId, pending);

  if (socket1) {
    socket1.emit("word_match_found", {
      roomId,
      opponent: player2.user,
      timeLimitSeconds: 10,
    });
  }

  if (socket2) {
    socket2.emit("word_match_found", {
      roomId,
      opponent: player1.user,
      timeLimitSeconds: 10,
    });
  }

  // Auto accept for bot
  if (player2.isBot) {
    setTimeout(() => {
      const p = pendingWordMatches.get(roomId);
      if (!p) return;
      p.player2Accepted = true;
      io.to(roomId).emit("word_match_acceptance_update", {
        player1Accepted: p.player1Accepted,
        player2Accepted: true,
      });

      if (p.player1Accepted && p.player2Accepted) {
        clearTimeout(p.acceptanceTimer);
        pendingWordMatches.delete(roomId);
        startWordRoleSelectionPhase(io, roomId, p.player1, p.player2);
      }
    }, 1200);
  }
}

/**
 * Start 5-Second Role Selection Phase (Setter vs Guesser)
 * First player to click an option claims it; other player gets the opposite!
 * If 5s expires without selection, randomly assigned.
 */
function startWordRoleSelectionPhase(io, roomId, player1, player2) {
  const room = {
    roomId,
    player1: {
      userId: player1.userId,
      username: player1.user.username,
      avatar: player1.user.avatar,
      synergy: player1.user.synergy || 0,
      socketId: player1.socketId,
      isBot: !!player1.isBot,
      chancesUsed: 0,
      maxChances: 8,
      guesses: [],
      isSolved: false,
    },
    player2: {
      userId: player2.userId,
      username: player2.user.username,
      avatar: player2.user.avatar,
      synergy: player2.user.synergy || 0,
      socketId: player2.socketId,
      isBot: !!player2.isBot,
      chancesUsed: 0,
      maxChances: 8,
      guesses: [],
      isSolved: false,
    },
    setterUserId: null,
    guesserUserId: null,
    setter: null,
    guesser: null,
    secretWord: null,
    status: "role_selection",
    roleTimer: null,
    botSetTimer: null,
    botGuessTimer: null,
  };

  activeWordRooms.set(roomId, room);

  // Broadcast 5-second role selection event
  io.to(roomId).emit("word_role_selection_start", {
    roomId,
    timeLimitSeconds: 5,
    player1: { userId: room.player1.userId, username: room.player1.username },
    player2: { userId: room.player2.userId, username: room.player2.username },
  });

  // Start 5-second server countdown for role pick
  room.roleTimer = setTimeout(() => {
    const cur = activeWordRooms.get(roomId);
    if (!cur || cur.status !== "role_selection") return;

    // Randomly assign roles if 5 seconds elapsed without pick
    const p1IsSetter = Math.random() < 0.5;
    const setterUserId = p1IsSetter ? cur.player1.userId : cur.player2.userId;
    const guesserUserId = p1IsSetter ? cur.player2.userId : cur.player1.userId;

    console.log(
      `[Word Duel Role Timeout] 5s elapsed. Randomly assigning: Setter=${setterUserId}, Guesser=${guesserUserId}`
    );

    assignRolesAndStartGame(
      io,
      roomId,
      setterUserId,
      guesserUserId,
      null,
      "random"
    );
  }, 5000);
}

/**
 * Assign roles, notify players, and transition into game countdown & secret setting
 */
function assignRolesAndStartGame(io, roomId, setterUserId, guesserUserId, pickedByUsername, chosenRole) {
  const room = activeWordRooms.get(roomId);
  if (!room) return;

  const sId = setterUserId.toString();
  const gId = guesserUserId.toString();
  room.setterUserId = sId;
  room.guesserUserId = gId;
  room.setter = room.player1.userId.toString() === sId ? room.player1 : room.player2;
  room.guesser = room.player1.userId.toString() === gId ? room.player1 : room.player2;
  room.status = "role_locked";

  console.log(
    `[Word Duel Role Assigned] Room ${roomId} => Setter: ${room.setter.username} (${sId}), Guesser: ${room.guesser.username} (${gId})`
  );

  // Notify each player with THEIR exact assigned role directly to their socket
  const baseLockedData = {
    roomId,
    setterUserId: sId,
    setterUsername: room.setter.username,
    guesserUserId: gId,
    guesserUsername: room.guesser.username,
    pickedByUsername,
    chosenRole,
  };

  if (room.setter.socketId) {
    io.to(room.setter.socketId).emit("word_role_locked", {
      ...baseLockedData,
      myRole: "SETTER",
    });
  }

  if (room.guesser.socketId) {
    io.to(room.guesser.socketId).emit("word_role_locked", {
      ...baseLockedData,
      myRole: "GUESSER",
    });
  }

  // After 1.5 seconds visual feedback, proceed to 3s countdown & setting
  setTimeout(() => {
    const active = activeWordRooms.get(roomId);
    if (!active) return;

    active.status = "countdown";

    const baseCountdownData = {
      roomId,
      player1: active.player1,
      player2: active.player2,
      setterUserId: active.setterUserId,
      guesserUserId: active.guesserUserId,
      setterUsername: active.setter.username,
      guesserUsername: active.guesser.username,
      countdownSeconds: 3,
    };

    if (active.setter.socketId) {
      io.to(active.setter.socketId).emit("word_battle_countdown", {
        ...baseCountdownData,
        myRole: "SETTER",
      });
    }

    if (active.guesser.socketId) {
      io.to(active.guesser.socketId).emit("word_battle_countdown", {
        ...baseCountdownData,
        myRole: "GUESSER",
      });
    }

    setTimeout(() => {
      const live = activeWordRooms.get(roomId);
      if (!live) return;

      live.status = "setting_secret";

      const baseSecretData = {
        roomId,
        setterUserId: live.setterUserId,
        setterUsername: live.setter.username,
        guesserUserId: live.guesserUserId,
        guesserUsername: live.guesser.username,
        suggestedWords: ANIME_GAME_WORDS.slice(0, 12),
        timeLimitSeconds: 30,
      };

      if (live.setter.socketId) {
        io.to(live.setter.socketId).emit("word_phase_set_secret", {
          ...baseSecretData,
          myRole: "SETTER",
        });
      }

      if (live.guesser.socketId) {
        io.to(live.guesser.socketId).emit("word_phase_set_secret", {
          ...baseSecretData,
          myRole: "GUESSER",
        });
      }

      // If the setter is a bot, pick secret word after 1.5s
      if (live.setter.isBot) {
        live.botSetTimer = setTimeout(() => {
          const pool = ANIME_GAME_WORDS;
          const chosen = pool[Math.floor(Math.random() * pool.length)];
          live.secretWord = chosen;

          console.log(`[Word Bot Setter] ${live.setter.username} sealed secret word: ${chosen}`);

          if (live.guesser.socketId) {
            io.to(live.guesser.socketId).emit("word_secret_ready", {
              roomId,
              setterUsername: live.setter.username,
              wordLength: chosen.length,
            });
          }

          checkAndStartGuessingPhase(io, roomId);
        }, 1500);
      }
    }, 3200);
  }, 1500);
}

/**
 * Check and start guessing phase
 */
function checkAndStartGuessingPhase(io, roomId) {
  const room = activeWordRooms.get(roomId);
  if (!room || !room.secretWord) return;

  room.status = "guessing";
  const setter = room.player1.userId === room.setterUserId ? room.player1 : room.player2;
  const guesser = room.player1.userId === room.guesserUserId ? room.player1 : room.player2;

  const baseRoundData = {
    roomId,
    setterUserId: room.setterUserId,
    setterUsername: setter.username,
    guesserUserId: room.guesserUserId,
    guesserUsername: guesser.username,
    wordLength: room.secretWord.length,
    maxChances: 8,
  };

  if (setter.socketId) {
    io.to(setter.socketId).emit("word_round_start", {
      ...baseRoundData,
      myRole: "SETTER",
      secretWordForSetter: room.secretWord,
    });
  }

  if (guesser.socketId) {
    io.to(guesser.socketId).emit("word_round_start", {
      ...baseRoundData,
      myRole: "GUESSER",
      secretWordForSetter: null,
    });
  }

  // If guesser is a bot, start automated bot guesser loop!
  if (guesser.isBot) {
    startBotGuesserLoop(io, roomId);
  }
}

/**
 * Execute Word Guess (Evaluates feedback and broadcasts to BOTH Guesser and Setter)
 */
function executeWordGuess(io, room, guessWord) {
  const cleanGuess = (guessWord || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  const secretWord = room.secretWord;
  const guesser = room.player1.userId === room.guesserUserId ? room.player1 : room.player2;
  const setter = room.player1.userId === room.setterUserId ? room.player1 : room.player2;

  const feedback = evaluateWordGuess(cleanGuess, secretWord);
  guesser.chancesUsed += 1;
  const chancesLeft = 8 - guesser.chancesUsed;
  const isCorrect = feedback.every((c) => c === "green");

  if (isCorrect) {
    guesser.isSolved = true;
  }

  const guessRecord = {
    guessIndex: guesser.chancesUsed - 1,
    guess: cleanGuess,
    feedback,
    isCorrect,
  };
  guesser.guesses.push(guessRecord);

  const isGameOver = isCorrect || chancesLeft === 0;

  // Clear live typing
  io.to(room.roomId).emit("word_opponent_typing", {
    roomId: room.roomId,
    currentInput: "",
  });

  // Broadcast guess result to BOTH the Guesser AND the Setter!
  io.to(room.roomId).emit("word_guess_result", {
    roomId: room.roomId,
    guessIndex: guesser.chancesUsed - 1,
    guess: cleanGuess,
    feedback,
    chancesUsed: guesser.chancesUsed,
    chancesLeft,
    won: isCorrect,
    isGameOver,
    secretWord: isGameOver ? secretWord : undefined,
  });

  if (isGameOver) {
    resolveWordGame(io, room.roomId, guesser, setter, isCorrect);
  }
}

/**
 * Automated Bot Guesser Loop (Runs when Bot is the Guesser and Human is the Setter)
 */
function startBotGuesserLoop(io, roomId) {
  const room = activeWordRooms.get(roomId);
  if (!room || room.status !== "guessing") return;

  const targetLen = room.secretWord.length;
  const candidates = ANIME_GAME_WORDS.filter((w) => w.length === targetLen);
  if (!candidates.length) candidates.push(room.secretWord);

  const botGuess = () => {
    const currentRoom = activeWordRooms.get(roomId);
    if (!currentRoom || currentRoom.status !== "guessing") return;

    const guesser =
      currentRoom.player1.userId === currentRoom.guesserUserId ? currentRoom.player1 : currentRoom.player2;
    if (guesser.chancesUsed >= 8 || guesser.isSolved) return;

    // Pick a word
    let chosenWord;
    const shouldSolve = guesser.chancesUsed >= 5 && Math.random() < 0.45;
    if (shouldSolve) {
      chosenWord = currentRoom.secretWord;
    } else {
      chosenWord = candidates[Math.floor(Math.random() * candidates.length)] || currentRoom.secretWord;
    }

    // 1. Simulate typing letter by letter to the setter
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      charIndex++;
      const currentInput = chosenWord.substring(0, charIndex);
      io.to(currentRoom.roomId).emit("word_opponent_typing", {
        roomId: currentRoom.roomId,
        currentInput,
      });

      if (charIndex >= chosenWord.length) {
        clearInterval(typingInterval);

        // 2. Submit guess after brief pause
        setTimeout(() => {
          executeWordGuess(io, currentRoom, chosenWord);

          // If still in guessing phase, schedule next bot guess
          if (currentRoom.status === "guessing" && guesser.chancesUsed < 8 && !guesser.isSolved) {
            currentRoom.botGuessTimer = setTimeout(botGuess, 2600);
          }
        }, 500);
      }
    }, 180);
  };

  room.botGuessTimer = setTimeout(botGuess, 2200);
}

/**
 * Resolve game, award synergy, notify players
 */
async function resolveWordGame(io, roomId, guesser, setter, isWin) {
  const room = activeWordRooms.get(roomId);
  if (!room) return;

  room.status = "game_over";
  if (room.roleTimer) clearTimeout(room.roleTimer);
  if (room.botGuessTimer) clearTimeout(room.botGuessTimer);
  if (room.botSetTimer) clearTimeout(room.botSetTimer);

  let newGuesserSynergy = undefined;
  let newSetterSynergy = undefined;

  if (isWin) {
    // Guesser cracked the cipher!
    try {
      if (!guesser.isBot) {
        const u = await User.findByIdAndUpdate(
          guesser.userId,
          { $inc: { synergy: 25 } },
          { new: true }
        ).select("synergy");
        newGuesserSynergy = u?.synergy;
        console.log(`[Word Duel] Guesser ${guesser.username} cracked cipher! Synergy: ${newGuesserSynergy}`);
      }
      if (!setter.isBot) {
        const s = await User.findByIdAndUpdate(
          setter.userId,
          { $inc: { synergy: 5 } },
          { new: true }
        ).select("synergy");
        newSetterSynergy = s?.synergy;
      }
    } catch (e) {
      console.error("[Word Duel Synergy Error]:", e);
    }
  } else {
    // Setter's cipher was unbroken! Setter wins!
    try {
      if (!setter.isBot) {
        const s = await User.findByIdAndUpdate(
          setter.userId,
          { $inc: { synergy: 25 } },
          { new: true }
        ).select("synergy");
        newSetterSynergy = s?.synergy;
        console.log(`[Word Duel] Setter ${setter.username} cipher was unbroken! Synergy: ${newSetterSynergy}`);
      }
      if (!guesser.isBot) {
        const g = await User.findByIdAndUpdate(
          guesser.userId,
          { $inc: { synergy: 5 } },
          { new: true }
        ).select("synergy");
        newGuesserSynergy = g?.synergy;
      }
    } catch (e) {
      console.error("[Word Duel Synergy Error]:", e);
    }
  }

  io.to(roomId).emit("word_game_over", {
    roomId,
    winnerId: isWin ? guesser.userId : setter.userId,
    winnerUsername: isWin ? guesser.username : setter.username,
    winnerRole: isWin ? "guesser" : "setter",
    isWin, // true if guesser cracked it
    secretWord: room.secretWord,
    totalGuesses: guesser.chancesUsed,
    guesser: {
      userId: guesser.userId,
      username: guesser.username,
      avatar: guesser.avatar,
      chancesUsed: guesser.chancesUsed,
      won: isWin,
      newSynergy: newGuesserSynergy,
      synergyEarned: isWin ? 25 : 5,
    },
    setter: {
      userId: setter.userId,
      username: setter.username,
      avatar: setter.avatar,
      won: !isWin,
      newSynergy: newSetterSynergy,
      synergyEarned: !isWin ? 25 : 5,
    },
  });
}
