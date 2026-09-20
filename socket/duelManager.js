import { User, QuizQuestion, AnimeTitle, GameTitle, DuelHistory } from "../Models/index.js";
import { generateUserId } from "../utils/jwt.js";
import mongoose from "mongoose";

// In-memory active matchmaking queue
// { socketId, userId, gender, user, joinedAt, botFallbackTimer }
const matchmakingQueue = [];

// In-memory active duel rooms
// roomId -> RoomState
const activeRooms = new Map();

// Pending match acceptance rooms
// roomId -> { player1, player2, questions, expiresAt, acceptanceTimer }
const pendingMatches = new Map();

/**
 * Curated Pool of Realistic Anime & Gaming Challenger Personas
 * Male players are paired with attractive Female Personas
 * Female players are paired with cool Male Personas
 */
const BOT_PERSONAS = {
  female: [
    {
      username: "Sakura_Chan99",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      gender: "female",
      anime: ["Naruto", "Demon Slayer", "Jujutsu Kaisen"],
      games: ["Genshin Impact", "Valorant"],
    },
    {
      username: "Aria_Valkyrie",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
      gender: "female",
      anime: ["Attack on Titan", "Bleach", "One Piece"],
      games: ["League of Legends", "CS2"],
    },
    {
      username: "Hinata_Hime",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
      gender: "female",
      anime: ["Naruto", "My Hero Academia", "Spy x Family"],
      games: ["Honkai: Star Rail", "Apex Legends"],
    },
    {
      username: "Miku_Chii",
      avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80",
      gender: "female",
      anime: ["Chainsaw Man", "Death Note", "Hunter x Hunter"],
      games: ["Overwatch 2", "Genshin Impact"],
    },
    {
      username: "Rin_Tohsaka",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
      gender: "female",
      anime: ["Fate/Zero", "Fullmetal Alchemist", "Solo Leveling"],
      games: ["Elden Ring", "Valorant"],
    },
    {
      username: "Yuki_Tsukuyomi",
      avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80",
      gender: "female",
      anime: ["Demon Slayer", "Tokyo Ghoul", "Cyberpunk: Edgerunners"],
      games: ["Cyberpunk 2077", "CS2"],
    },
    {
      username: "Chika_Senpai",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      gender: "female",
      anime: ["Kaguya-sama: Love Is War", "Bocchi the Rock!", "Oshi no Ko"],
      games: ["Animal Crossing", "Valorant"],
    },
    {
      username: "Mai_Sakurajima",
      avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80",
      gender: "female",
      anime: ["Rascal Does Not Dream of Bunny Girl Senpai", "Steins;Gate", "Vinland Saga"],
      games: ["Final Fantasy VII", "Genshin Impact"],
    },
  ],
  male: [
    {
      username: "Ren_Amamiya",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      gender: "male",
      anime: ["Persona 5", "Death Note", "Code Geass"],
      games: ["Persona 5 Royal", "Elden Ring"],
    },
    {
      username: "Levi_Ackerman",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      gender: "male",
      anime: ["Attack on Titan", "Solo Leveling", "Vinland Saga"],
      games: ["CS2", "Apex Legends"],
    },
    {
      username: "Kenji_Shadow",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
      gender: "male",
      anime: ["Jujutsu Kaisen", "Bleach", "One Piece"],
      games: ["Valorant", "League of Legends"],
    },
    {
      username: "Kaito_Kid",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
      gender: "male",
      anime: ["Detective Conan", "Hunter x Hunter", "Steins;Gate"],
      games: ["Grand Theft Auto V", "Cyberpunk 2077"],
    },
    {
      username: "Gojo_Sensei",
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
      gender: "male",
      anime: ["Jujutsu Kaisen", "Chainsaw Man", "Demon Slayer"],
      games: ["Overwatch 2", "Tekken 8"],
    },
    {
      username: "Zack_Fair",
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
      gender: "male",
      anime: ["Final Fantasy VII: Advent Children", "Berserk", "Dragon Ball Z"],
      games: ["Final Fantasy VII Rebirth", "Monster Hunter: World"],
    },
    {
      username: "Killua_Z",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
      gender: "male",
      anime: ["Hunter x Hunter", "Mob Psycho 100", "One Punch Man"],
      games: ["Valorant", "Honkai: Star Rail"],
    },
    {
      username: "Todoroki_S",
      avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=400&q=80",
      gender: "male",
      anime: ["My Hero Academia", "Fullmetal Alchemist", "Demon Slayer"],
      games: ["Apex Legends", "Genshin Impact"],
    },
  ],
};

const botUserCache = new Map();
// In-memory mapping to remember the last bot persona matched with each user
const userLastBotMap = new Map();

/**
 * Retrieve or create a genuine MongoDB user document for a bot persona with rotation memory
 */
async function getOrCreateBotUser(targetGender = "female", playerPreferences = {}, playerUserId = null) {
  const pool = BOT_PERSONAS[targetGender] || BOT_PERSONAS.female;
  const lastBotName = playerUserId ? userLastBotMap.get(playerUserId.toString()) : null;

  // Filter out previously encountered bot persona to always assign a fresh rival
  let availablePool = pool.filter((p) => p.username !== lastBotName);
  if (!availablePool.length) {
    availablePool = pool;
  }

  const persona = availablePool[Math.floor(Math.random() * availablePool.length)];

  if (playerUserId) {
    userLastBotMap.set(playerUserId.toString(), persona.username);
  }

  const botEmail = `bot_${persona.username.toLowerCase().replace(/[^a-z0-9]/g, "")}@otakuduo.internal`;

  if (botUserCache.has(botEmail)) {
    return botUserCache.get(botEmail);
  }

  let botUser = await User.findOne({ email: botEmail });
  if (!botUser) {
    botUser = await User.create({
      userId: await generateUserId(),
      username: persona.username,
      email: botEmail,
      gender: persona.gender,
      profilePics: [persona.avatar],
      avatar: persona.avatar,
      isBot: true,
      isProfileCompleted: true,
      isOnboarded: true,
      isVerified: true,
      bio: "Master Anime & Gaming Duelist ⚡",
      preferences: {
        path: "both",
        animeFavorites: (persona.anime || []).map((title) => ({
          title,
          image: persona.avatar,
          isCustom: true,
        })),
        gameFavorites: (persona.games || []).map((title) => ({
          title,
          image: persona.avatar,
          isCustom: true,
        })),
      },
    });
  }

  const botObj = {
    _id: botUser._id,
    username: botUser.username,
    profilePics: botUser.profilePics,
    avatar: botUser.profilePics?.[0] || persona.avatar,
    preferences: {
      path: "both",
      animeFavorites: persona.anime,
      gameFavorites: persona.games,
    },
  };

  botUserCache.set(botEmail, botObj);
  return botObj;
}

/**
 * Initialize Duel WebSocket event handlers
 */
export function initDuelSocketHandlers(io, socket) {
  const userId = socket.userId;

  // 1. Join Matchmaking Queue
  socket.on("duel_join_queue", async (data = {}) => {
    try {
      if (!userId) {
        return socket.emit("duel_error", { message: "Authentication required." });
      }

      // Remove from any existing queue or rooms
      removeFromQueue(userId);

      const userDoc = await User.findById(userId)
        .select("username profilePics preferences activeSubscription isPremium gender")
        .populate("preferences.animeFavorites preferences.gameFavorites")
        .lean();

      if (!userDoc) {
        return socket.emit("duel_error", { message: "User profile not found." });
      }

      // Check Otaku Pass subscription status (unlimited games)
      const hasPass =
        userDoc.activeSubscription?.expiresAt &&
        new Date(userDoc.activeSubscription.expiresAt) > new Date() &&
        (userDoc.activeSubscription.planId === "otaku-pass" || userDoc.isPremium);

      // If free user, enforce daily limit of 3 duels per calendar day
      if (!hasPass) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayDuelsCount = await DuelHistory.countDocuments({
          $or: [{ player1: userId }, { player2: userId }],
          createdAt: { $gte: startOfDay },
        });

        if (todayDuelsCount >= 3) {
          return socket.emit("duel_limit_reached", {
            message:
              "Daily combat limit reached (3/3 matches played). Upgrade to Otaku Pass for unlimited PvP arena duels!",
            dailyPlayed: todayDuelsCount,
            dailyLimit: 3,
            hasPass: false,
          });
        }
      }

      console.log(`[Duel Queue] User ${userDoc.username} (${userId}) joined queue.`);

      const queueEntry = {
        socketId: socket.id,
        userId: userId.toString(),
        gender: userDoc.gender || "male",
        user: {
          _id: userDoc._id,
          username: userDoc.username,
          avatar: userDoc.profilePics?.[0] || "",
          path: userDoc.preferences?.path || "both",
          animeFavorites: (userDoc.preferences?.animeFavorites || []).map((f) =>
            typeof f === "object" ? f.title : f
          ),
          gameFavorites: (userDoc.preferences?.gameFavorites || []).map((f) =>
            typeof f === "object" ? f.title : f
          ),
          hasPass: !!(
            userDoc.activeSubscription &&
            new Date(userDoc.activeSubscription.expiresAt) > new Date()
          ),
        },
        joinedAt: Date.now(),
        botFallbackTimer: null,
      };

      // Check if there is an available opponent in queue
      const opponentIndex = matchmakingQueue.findIndex((entry) => entry.userId !== userId.toString());

      if (opponentIndex !== -1) {
        const opponent = matchmakingQueue.splice(opponentIndex, 1)[0];
        if (opponent.botFallbackTimer) {
          clearTimeout(opponent.botFallbackTimer);
          opponent.botFallbackTimer = null;
        }
        // Create match found confirmation with human player
        createMatchFoundPrompt(io, queueEntry, opponent);
      } else {
        // Set 8-Second AI Shadow Duelist Bot Fallback
        queueEntry.botFallbackTimer = setTimeout(async () => {
          try {
            const idx = matchmakingQueue.findIndex((entry) => entry.userId === userId.toString());
            if (idx === -1) return; // Already matched or left

            const [playerEntry] = matchmakingQueue.splice(idx, 1);
            playerEntry.botFallbackTimer = null;

            // Select opposite gender for bot
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
                path: botUser.preferences?.path || "both",
                animeFavorites: botUser.preferences?.animeFavorites || [],
                gameFavorites: botUser.preferences?.gameFavorites || [],
                hasPass: true,
              },
              joinedAt: Date.now(),
            };

            console.log(
              `[Duel Bot Fallback] 15s reached. Pairing ${playerEntry.user.username} with AI Rival ${botQueueEntry.user.username} (${targetBotGender})`
            );
            createMatchFoundPrompt(io, playerEntry, botQueueEntry);
          } catch (botErr) {
            console.error("[Duel Bot Fallback Error]:", botErr);
          }
        }, 15000);

        matchmakingQueue.push(queueEntry);
        socket.emit("duel_queue_status", { status: "searching", position: matchmakingQueue.length });
      }
    } catch (err) {
      console.error("[Duel Queue Error]:", err);
      socket.emit("duel_error", { message: "Failed to join queue." });
    }
  });

  // 2. Leave Matchmaking Queue
  socket.on("duel_leave_queue", () => {
    removeFromQueue(userId);
    socket.emit("duel_queue_status", { status: "idle" });
  });

  // 3. Accept Match Found
  socket.on("duel_accept_match", async ({ roomId }) => {
    const pending = pendingMatches.get(roomId);
    if (!pending) {
      return socket.emit("duel_error", { message: "Match expired or not found." });
    }

    if (pending.player1.userId === userId.toString()) {
      pending.player1Accepted = true;
    } else if (pending.player2.userId === userId.toString()) {
      pending.player2Accepted = true;
    }

    // Broadcast partial acceptance update
    io.to(roomId).emit("duel_match_acceptance_update", {
      player1Accepted: pending.player1Accepted,
      player2Accepted: pending.player2Accepted,
    });

    // If both players accepted, start the game!
    if (pending.player1Accepted && pending.player2Accepted) {
      clearTimeout(pending.acceptanceTimer);
      pendingMatches.delete(roomId);
      startLiveDuelGame(io, roomId, pending.player1, pending.player2, pending.questions);
    }
  });

  // 4. Decline Match Found
  socket.on("duel_decline_match", ({ roomId }) => {
    const pending = pendingMatches.get(roomId);
    if (!pending) return;

    clearTimeout(pending.acceptanceTimer);
    pendingMatches.delete(roomId);

    io.to(roomId).emit("duel_match_declined", {
      message: "Match was declined by one of the players.",
    });

    // Notify other player if not bot
    const otherPlayer =
      pending.player1.userId === userId.toString() ? pending.player2 : pending.player1;

    if (otherPlayer && otherPlayer.socketId) {
      io.to(otherPlayer.socketId).emit("duel_queue_status", {
        status: "opponent_declined",
        message: "Your opponent declined the match. Re-queued for a new match.",
      });
    }
  });

  // 5. Submit Answer during active round
  socket.on("duel_submit_answer", ({ roomId, roundIndex, selectedOption, clientAnswerTimeMs }) => {
    const room = activeRooms.get(roomId);
    if (!room || room.status !== "in_round" || room.currentRound !== roundIndex) {
      return;
    }

    const isPlayer1 = room.player1.userId === userId.toString();
    const isPlayer2 = room.player2.userId === userId.toString();

    if (!isPlayer1 && !isPlayer2) return;

    const roundData = room.questions[room.currentRound];
    if (!roundData) return;

    const playerState = isPlayer1 ? room.player1 : room.player2;

    // Ignore if player already submitted this round
    if (playerState.answeredThisRound) return;

    playerState.answeredThisRound = true;
    playerState.selectedOption = selectedOption;

    const isCorrect =
      selectedOption &&
      selectedOption.trim().toLowerCase() === roundData.correctAnswer.trim().toLowerCase();

    // Calculate score: Base 100 pts + speed bonus up to 50 pts + combo streak
    let roundPoints = 0;
    if (isCorrect) {
      playerState.streak = (playerState.streak || 0) + 1;
      playerState.correctCount = (playerState.correctCount || 0) + 1;

      const remainingTimeMs = Math.max(0, 10000 - (clientAnswerTimeMs || 5000));
      const speedBonus = Math.floor((remainingTimeMs / 10000) * 50);
      const streakBonus = Math.min((playerState.streak - 1) * 15, 60);

      roundPoints = 100 + speedBonus + streakBonus;
      playerState.score += roundPoints;
    } else {
      playerState.streak = 0;
    }

    playerState.lastRoundPoints = roundPoints;
    playerState.lastIsCorrect = isCorrect;

    // Notify room that this player has answered (without revealing the actual answer to the opponent yet!)
    io.to(roomId).emit("duel_player_answered", {
      userId,
      isPlayer1,
      answered: true,
    });

    // If both players answered before timer expires, advance immediately
    if (room.player1.answeredThisRound && room.player2.answeredThisRound) {
      clearTimeout(room.roundTimer);
      if (room.botAnswerTimer) clearTimeout(room.botAnswerTimer);
      if (room.botAnswerTimer1) clearTimeout(room.botAnswerTimer1);
      resolveRound(io, roomId);
    }
  });

  // 6. Handle Disconnect during duel
  socket.on("disconnect", () => {
    removeFromQueue(userId);

    // Check if user was in a pending match
    for (const [roomId, pending] of pendingMatches.entries()) {
      if (pending.player1.userId === userId.toString() || pending.player2.userId === userId.toString()) {
        clearTimeout(pending.acceptanceTimer);
        pendingMatches.delete(roomId);
        io.to(roomId).emit("duel_match_declined", {
          message: "A player disconnected during match calibration.",
        });
      }
    }

    // Check if user was in an active room
    for (const [roomId, room] of activeRooms.entries()) {
      if (room.player1.userId === userId.toString() || room.player2.userId === userId.toString()) {
        const remainingPlayer =
          room.player1.userId === userId.toString() ? room.player2 : room.player1;

        clearTimeout(room.roundTimer);
        clearTimeout(room.nextRoundTimer);
        if (room.botAnswerTimer) clearTimeout(room.botAnswerTimer);
        if (room.botAnswerTimer1) clearTimeout(room.botAnswerTimer1);

        io.to(roomId).emit("duel_opponent_disconnected", {
          winnerId: remainingPlayer.userId,
          message: "Opponent forfeited by disconnecting.",
        });

        activeRooms.delete(roomId);
      }
    }
  });
}

/**
 * Remove a user from the matchmaking queue and clear timers
 */
function removeFromQueue(userId) {
  const idx = matchmakingQueue.findIndex((entry) => entry.userId === userId.toString());
  if (idx !== -1) {
    const [entry] = matchmakingQueue.splice(idx, 1);
    if (entry && entry.botFallbackTimer) {
      clearTimeout(entry.botFallbackTimer);
      entry.botFallbackTimer = null;
    }
  }
}

/**
 * Match Found: Prompt players with a 10s acceptance window
 */
async function createMatchFoundPrompt(io, player1, player2) {
  const roomId = `duel_${new Date().getTime()}_${Math.random().toString(36).substring(2, 7)}`;

  // Load 5 personalized questions matching both players' favorite anime/games from MongoDB
  const combinedTitles = Array.from(
    new Set([
      ...(player1.user.animeFavorites || []),
      ...(player1.user.gameFavorites || []),
      ...(player2.user.animeFavorites || []),
      ...(player2.user.gameFavorites || []),
    ])
  );

  let questions = [];

  try {
    if (combinedTitles.length > 0) {
      const titleRegexes = combinedTitles.map(
        (t) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
      );

      questions = await QuizQuestion.aggregate([
        { $match: { title: { $in: titleRegexes } } },
        { $sample: { size: 5 } },
      ]);
    }

    // Fill remaining questions from general pool if needed
    if (questions.length < 5) {
      const needed = 5 - questions.length;
      const existingIds = questions.map((q) => q._id);
      const general = await QuizQuestion.aggregate([
        { $match: { _id: { $nin: existingIds }, options: { $nin: ["A", "B", "C", "D"] } } },
        { $sample: { size: needed } },
      ]);
      questions = [...questions, ...general];
    }

    // Sanitize question options and correct answer
    questions = questions
      .filter((q) => Array.isArray(q.options) && q.options.length === 4)
      .map((q) => {
        const cleanOpts = q.options.map((opt) =>
          String(opt).replace(/^[A-Da-d0-9][\.\)\-\:]\s*/, "").trim()
        );
        const rawCorrect = String(q.correctAnswer || "")
          .replace(/^[A-Da-d0-9][\.\)\-\:]\s*/, "")
          .trim();
        const match = cleanOpts.find((o) => o.toLowerCase() === rawCorrect.toLowerCase());
        return {
          question: q.question,
          options: cleanOpts,
          correctAnswer: match || cleanOpts[0],
          explanation: q.explanation || "",
          category: q.category || q.title || "Anime & Gaming",
          difficulty: q.difficulty || "medium",
        };
      });
  } catch (err) {
    console.error("[Duel Question Load Error]:", err);
  }

  // Final fallback questions if database was empty
  if (questions.length === 0) {
    questions = [
      {
        question: "What is Luffy's signature Devil Fruit in One Piece?",
        options: ["Gomu Gomu no Mi", "Mera Mera no Mi", "Ope Ope no Mi", "Gura Gura no Mi"],
        correctAnswer: "Gomu Gomu no Mi",
        difficulty: "easy",
        explanation: "Monkey D. Luffy ate the Gomu Gomu no Mi (Hito Hito no Mi, Model: Nika).",
      },
      {
        question: "What is the primary city where GTA V takes place?",
        options: ["Los Santos", "Liberty City", "Vice City", "San Fierro"],
        correctAnswer: "Los Santos",
        difficulty: "easy",
        explanation: "GTA V is set in Los Santos and Blaine County.",
      },
      {
        question: "What is Gojo's Domain Expansion called in Jujutsu Kaisen?",
        options: ["Unlimited Void", "Malevolent Shrine", "Chimera Shadow Garden", "Coffin of the Iron Mountain"],
        correctAnswer: "Unlimited Void",
        difficulty: "easy",
        explanation: "Satoru Gojo's domain expansion is Unlimited Void.",
      },
      {
        question: "Which weapon in CS2 inflicts one-hit fatal body damage?",
        options: ["AWP", "SSG 08", "M4A4", "AK-47"],
        correctAnswer: "AWP",
        difficulty: "easy",
        explanation: "The AWP sniper rifle delivers fatal torso damage.",
      },
      {
        question: "Who was the creator of the Rasengan in Naruto?",
        options: ["Minato Namikaze", "Jiraiya", "Kakashi Hatake", "Tobirama Senju"],
        correctAnswer: "Minato Namikaze",
        difficulty: "medium",
        explanation: "The Fourth Hokage Minato Namikaze created the Rasengan.",
      },
    ];
  }

  // Join connected socket(s) to the duel room
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
    questions,
    expiresAt: Date.now() + 10000,
    acceptanceTimer: null,
  };

  pending.acceptanceTimer = setTimeout(() => {
    pendingMatches.delete(roomId);
    io.to(roomId).emit("duel_match_expired", {
      message: "Acceptance countdown expired. Match cancelled.",
    });
  }, 10000);

  pendingMatches.set(roomId, pending);

  // Emit match found with opponent details and 10s countdown
  if (socket1) {
    socket1.emit("duel_match_found", {
      roomId,
      opponent: player2.user,
      timeLimitSeconds: 10,
    });
  }

  if (socket2) {
    socket2.emit("duel_match_found", {
      roomId,
      opponent: player1.user,
      timeLimitSeconds: 10,
    });
  }

  // If Player 2 is a Bot, schedule realistic acceptance (1.2s - 2.2s delay)
  if (player2.isBot) {
    const botAcceptDelay = Math.floor(Math.random() * 1000) + 1200;
    setTimeout(() => {
      const p = pendingMatches.get(roomId);
      if (!p) return;
      p.player2Accepted = true;

      io.to(roomId).emit("duel_match_acceptance_update", {
        player1Accepted: p.player1Accepted,
        player2Accepted: true,
      });

      if (p.player1Accepted && p.player2Accepted) {
        clearTimeout(p.acceptanceTimer);
        pendingMatches.delete(roomId);
        startLiveDuelGame(io, roomId, p.player1, p.player2, p.questions);
      }
    }, botAcceptDelay);
  }

  // If Player 1 is a Bot (fallback safety)
  if (player1.isBot) {
    const botAcceptDelay = Math.floor(Math.random() * 1000) + 1200;
    setTimeout(() => {
      const p = pendingMatches.get(roomId);
      if (!p) return;
      p.player1Accepted = true;

      io.to(roomId).emit("duel_match_acceptance_update", {
        player1Accepted: true,
        player2Accepted: p.player2Accepted,
      });

      if (p.player1Accepted && p.player2Accepted) {
        clearTimeout(p.acceptanceTimer);
        pendingMatches.delete(roomId);
        startLiveDuelGame(io, roomId, p.player1, p.player2, p.questions);
      }
    }, botAcceptDelay);
  }

  console.log(
    `[Duel Match] Created match found prompt for ${player1.user.username} vs ${player2.user.username} in room ${roomId}`
  );
}

/**
 * Start live 1v1 synchronized game loop
 */
function startLiveDuelGame(io, roomId, player1, player2, questions) {
  const room = {
    roomId,
    player1: {
      userId: player1.userId,
      username: player1.user.username,
      avatar: player1.user.avatar,
      hasPass: player1.user.hasPass,
      isBot: !!player1.isBot,
      score: 0,
      streak: 0,
      correctCount: 0,
      answeredThisRound: false,
      selectedOption: null,
      lastRoundPoints: 0,
      lastIsCorrect: false,
    },
    player2: {
      userId: player2.userId,
      username: player2.user.username,
      avatar: player2.user.avatar,
      hasPass: player2.user.hasPass,
      isBot: !!player2.isBot,
      score: 0,
      streak: 0,
      correctCount: 0,
      answeredThisRound: false,
      selectedOption: null,
      lastRoundPoints: 0,
      lastIsCorrect: false,
    },
    questions,
    currentRound: 0,
    totalRounds: questions.length,
    status: "countdown",
    roundTimer: null,
    nextRoundTimer: null,
    botAnswerTimer: null,
    botAnswerTimer1: null,
  };

  activeRooms.set(roomId, room);

  // Emit 3-second battle countdown
  io.to(roomId).emit("duel_battle_countdown", {
    player1: room.player1,
    player2: room.player2,
    totalRounds: room.totalRounds,
    countdownSeconds: 3,
  });

  setTimeout(() => {
    startRound(io, roomId);
  }, 3200);
}

/**
 * Broadcast current round question to players (with sanitized options, no correct answer)
 */
function startRound(io, roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  const roundData = room.questions[room.currentRound];
  if (!roundData) {
    return finishGame(io, roomId);
  }

  if (room.botAnswerTimer) clearTimeout(room.botAnswerTimer);
  if (room.botAnswerTimer1) clearTimeout(room.botAnswerTimer1);

  room.status = "in_round";
  room.player1.answeredThisRound = false;
  room.player1.selectedOption = null;
  room.player1.lastRoundPoints = 0;
  room.player1.lastIsCorrect = false;

  room.player2.answeredThisRound = false;
  room.player2.selectedOption = null;
  room.player2.lastRoundPoints = 0;
  room.player2.lastIsCorrect = false;

  // Emit question without correctAnswer to protect integrity
  io.to(roomId).emit("duel_round_start", {
    roundIndex: room.currentRound,
    roundNumber: room.currentRound + 1,
    totalRounds: room.totalRounds,
    question: roundData.question,
    options: roundData.options,
    category: roundData.category || roundData.title || "Anime & Gaming",
    difficulty: roundData.difficulty || "medium",
    timeLimitSeconds: 10,
    player1Score: room.player1.score,
    player2Score: room.player2.score,
    player1Streak: room.player1.streak,
    player2Streak: room.player2.streak,
    player1: {
      userId: room.player1.userId,
      score: room.player1.score,
      streak: room.player1.streak,
    },
    player2: {
      userId: room.player2.userId,
      score: room.player2.score,
      streak: room.player2.streak,
    },
  });

  // If Player 2 is Bot, simulate quick lightning correct answer (1.5s - 2.5s)
  if (room.player2.isBot) {
    const botDelay = Math.floor(Math.random() * 1000) + 1500;
    room.botAnswerTimer = setTimeout(() => {
      const currentRoom = activeRooms.get(roomId);
      if (!currentRoom || currentRoom.status !== "in_round" || currentRoom.player2.answeredThisRound) return;

      const currentRoundData = currentRoom.questions[currentRoom.currentRound];
      if (!currentRoundData) return;

      const p2 = currentRoom.player2;
      p2.answeredThisRound = true;
      p2.selectedOption = currentRoundData.correctAnswer;
      p2.streak = (p2.streak || 0) + 1;
      p2.correctCount = (p2.correctCount || 0) + 1;

      // High speed bonus + combo streak bonus
      const remainingTimeMs = Math.max(0, 10000 - botDelay);
      const speedBonus = Math.floor((remainingTimeMs / 10000) * 50);
      const streakBonus = Math.min((p2.streak - 1) * 15, 60);
      const roundPoints = 100 + speedBonus + streakBonus;

      p2.score += roundPoints;
      p2.lastRoundPoints = roundPoints;
      p2.lastIsCorrect = true;

      io.to(roomId).emit("duel_player_answered", {
        userId: p2.userId,
        isPlayer1: false,
        answered: true,
      });

      if (currentRoom.player1.answeredThisRound && currentRoom.player2.answeredThisRound) {
        clearTimeout(currentRoom.roundTimer);
        resolveRound(io, roomId);
      }
    }, botDelay);
  }

  // If Player 1 is Bot (safety check)
  if (room.player1.isBot) {
    const botDelay = Math.floor(Math.random() * 1000) + 1500;
    room.botAnswerTimer1 = setTimeout(() => {
      const currentRoom = activeRooms.get(roomId);
      if (!currentRoom || currentRoom.status !== "in_round" || currentRoom.player1.answeredThisRound) return;

      const currentRoundData = currentRoom.questions[currentRoom.currentRound];
      if (!currentRoundData) return;

      const p1 = currentRoom.player1;
      p1.answeredThisRound = true;
      p1.selectedOption = currentRoundData.correctAnswer;
      p1.streak = (p1.streak || 0) + 1;
      p1.correctCount = (p1.correctCount || 0) + 1;

      const remainingTimeMs = Math.max(0, 10000 - botDelay);
      const speedBonus = Math.floor((remainingTimeMs / 10000) * 50);
      const streakBonus = Math.min((p1.streak - 1) * 15, 60);
      const roundPoints = 100 + speedBonus + streakBonus;

      p1.score += roundPoints;
      p1.lastRoundPoints = roundPoints;
      p1.lastIsCorrect = true;

      io.to(roomId).emit("duel_player_answered", {
        userId: p1.userId,
        isPlayer1: true,
        answered: true,
      });

      if (currentRoom.player1.answeredThisRound && currentRoom.player2.answeredThisRound) {
        clearTimeout(currentRoom.roundTimer);
        resolveRound(io, roomId);
      }
    }, botDelay);
  }

  // 10-second round timer
  room.roundTimer = setTimeout(() => {
    resolveRound(io, roomId);
  }, 10000);
}

/**
 * Resolve round results, reveal correct answer, and advance
 */
function resolveRound(io, roomId) {
  const room = activeRooms.get(roomId);
  if (!room || room.status !== "in_round") return;

  room.status = "round_results";
  clearTimeout(room.roundTimer);
  if (room.botAnswerTimer) clearTimeout(room.botAnswerTimer);
  if (room.botAnswerTimer1) clearTimeout(room.botAnswerTimer1);

  const roundData = room.questions[room.currentRound];

  io.to(roomId).emit("duel_round_result", {
    roundIndex: room.currentRound,
    correctAnswer: roundData.correctAnswer,
    explanation: roundData.explanation || "",
    player1: {
      userId: room.player1.userId,
      selectedOption: room.player1.selectedOption,
      isCorrect: room.player1.lastIsCorrect,
      roundPoints: room.player1.lastRoundPoints,
      totalScore: room.player1.score,
      streak: room.player1.streak,
    },
    player2: {
      userId: room.player2.userId,
      selectedOption: room.player2.selectedOption,
      isCorrect: room.player2.lastIsCorrect,
      roundPoints: room.player2.lastRoundPoints,
      totalScore: room.player2.score,
      streak: room.player2.streak,
    },
  });

  // 3.5s pause to see answer reveal, then advance to next round
  room.nextRoundTimer = setTimeout(() => {
    room.currentRound++;
    if (room.currentRound < room.totalRounds) {
      startRound(io, roomId);
    } else {
      finishGame(io, roomId);
    }
  }, 3500);
}

/**
 * Complete duel match, guarantee Bot victory if against Bot, and display post-game stats
 */
async function finishGame(io, roomId) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  clearTimeout(room.roundTimer);
  clearTimeout(room.nextRoundTimer);
  if (room.botAnswerTimer) clearTimeout(room.botAnswerTimer);
  if (room.botAnswerTimer1) clearTimeout(room.botAnswerTimer1);

  // Guarantee Bot Always Wins against real players
  if (room.player2.isBot) {
    if (room.player2.score <= room.player1.score) {
      const victoryMargin = Math.floor(Math.random() * 45) + 35;
      room.player2.score = room.player1.score + victoryMargin;
      room.player2.correctCount = room.totalRounds;
    }
  } else if (room.player1.isBot) {
    if (room.player1.score <= room.player2.score) {
      const victoryMargin = Math.floor(Math.random() * 45) + 35;
      room.player1.score = room.player2.score + victoryMargin;
      room.player1.correctCount = room.totalRounds;
    }
  }

  let winnerId = null;
  let isDraw = false;

  if (room.player1.score > room.player2.score) {
    winnerId = room.player1.userId;
  } else if (room.player2.score > room.player1.score) {
    winnerId = room.player2.userId;
  } else {
    isDraw = true;
  }

  // Award Quantum Synergy Points
  let p1SynergyEarned = 0;
  let p2SynergyEarned = 0;

  try {
    if (!isDraw) {
      if (winnerId === room.player1.userId) {
        p1SynergyEarned = 10;
        p2SynergyEarned = 0;
        if (!room.player1.isBot) {
          await User.findByIdAndUpdate(room.player1.userId, { $inc: { synergy: 10 } });
        }
      } else {
        p1SynergyEarned = 0;
        p2SynergyEarned = 10;
        if (!room.player2.isBot) {
          await User.findByIdAndUpdate(room.player2.userId, { $inc: { synergy: 10 } });
        }
      }
    } else {
      p1SynergyEarned = 5;
      p2SynergyEarned = 5;
      if (!room.player1.isBot) await User.findByIdAndUpdate(room.player1.userId, { $inc: { synergy: 5 } });
      if (!room.player2.isBot) await User.findByIdAndUpdate(room.player2.userId, { $inc: { synergy: 5 } });
    }

    // Persist Match in DuelHistory
    await DuelHistory.create({
      player1: room.player1.userId,
      player2: room.player2.userId,
      winner: winnerId || null,
      isDraw: isDraw,
      player1Score: room.player1.score,
      player2Score: room.player2.score,
      totalRounds: room.totalRounds,
    });
  } catch (dbErr) {
    console.error("[DuelManager] Error updating synergy or saving history:", dbErr);
  }

  const p1Accuracy = Math.round((room.player1.correctCount / room.totalRounds) * 100);
  const p2Accuracy = Math.round((room.player2.correctCount / room.totalRounds) * 100);

  io.to(roomId).emit("duel_game_over", {
    winnerId,
    isDraw,
    player1: {
      ...room.player1,
      accuracy: p1Accuracy,
      synergyEarned: p1SynergyEarned,
      xpEarned: Math.round(room.player1.score * 1.5) + (winnerId === room.player1.userId ? 250 : 50),
    },
    player2: {
      ...room.player2,
      accuracy: p2Accuracy,
      synergyEarned: p2SynergyEarned,
      xpEarned: Math.round(room.player2.score * 1.5) + (winnerId === room.player2.userId ? 250 : 50),
    },
  });

  console.log(
    `[Duel Game Over] Room ${roomId} finished. Winner: ${isDraw ? "DRAW" : winnerId} (+${
      winnerId === room.player1.userId ? p1SynergyEarned : p2SynergyEarned
    } Synergy)`
  );

  activeRooms.delete(roomId);
}
