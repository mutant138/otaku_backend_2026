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
 * Curated Pool of Anime & Gaming Secret Words with Hints (4 - 8 letters)
 */
export const ANIME_GAME_WORDS = [
  // 4 letters
  { word: "GOKU", hint: "A Saiyan warrior who transforms into a Super Saiyan to protect Earth" },
  { word: "ZORO", hint: "The swordsman of the Straw Hat crew who wields three blades at once" },
  { word: "NAMI", hint: "The navigator of the Straw Hats who can control weather with her staff" },
  { word: "LUKE", hint: "A Jedi who learned the ways of the Force and battled the Empire" },
  { word: "DOOM", hint: "A relentless space marine battling demons from hell on Mars" },
  { word: "HALO", hint: "A ring-shaped superweapon and the arena where a Master Chief fights" },
  { word: "APEX", hint: "A battle royale where Legends with unique abilities fight for glory" },
  { word: "SOUL", hint: "The spiritual essence that shinigami harvest in the afterlife" },
  { word: "MAGE", hint: "A magic-wielding class that casts spells from a distance in RPGs" },
  { word: "LEVI", hint: "Humanity's strongest soldier in the Scout Regiment with lightning speed" },
  { word: "SORA", hint: "A keyblade-wielding hero who travels between Disney and Final Fantasy worlds" },
  { word: "NEON", hint: "Glowing electrified light tubes that define the cyberpunk aesthetic" },
  { word: "RYUK", hint: "A Shinigami who dropped a deadly notebook into the human world" },
  { word: "JINX", hint: "An unhinged inventor with blue hair who loves chaos and explosions" },
  { word: "LINK", hint: "A young hero in a green tunic who wields the Triforce of Courage" },
  { word: "MECH", hint: "A giant mechanical suit piloted by a human in anime battles" },
  { word: "FIRE", hint: "The elemental attack that Natsu, Ace, and countless anime heroes breathe" },
  { word: "HERO", hint: "One for All quirk wielder who says 'Go beyond! Plus Ultra!'" },
  { word: "NOVA", hint: "A stellar explosion of energy — also a Guardians of the Galaxy Corps" },
  { word: "BOSS", hint: "The final powerful enemy at the end of a dungeon or game chapter" },
  { word: "MANA", hint: "The magical energy resource used to cast spells in most RPGs" },
  { word: "ZODD", hint: "An immortal apostle who fought for a thousand years in Berserk" },
  // 5 letters
  { word: "TITAN", hint: "A massive humanoid creature in Attack on Titan that devours humans" },
  { word: "ZELDA", hint: "A princess who holds the Triforce of Wisdom and often needs rescuing" },
  { word: "LUFFY", hint: "A rubber-bodied pirate captain who aims to become King of the Pirates" },
  { word: "ANIME", hint: "Japanese animation style known for vibrant art and dramatic storylines" },
  { word: "MANGA", hint: "Japanese comic books read right-to-left with black and white artwork" },
  { word: "CHIBI", hint: "A cute art style featuring characters with oversized heads and tiny bodies" },
  { word: "MECHA", hint: "Giant piloted robots that are a staple of sci-fi anime like Evangelion" },
  { word: "OTAKU", hint: "A person with obsessive interest in anime, manga, and Japanese pop culture" },
  { word: "NINJA", hint: "A covert agent trained in stealth, martial arts, and assassination in feudal Japan" },
  { word: "TOKYO", hint: "Japan's capital city and the setting for countless anime series" },
  { word: "BLADE", hint: "A sharp edged weapon, also a half-vampire Marvel hero who hunts the undead" },
  { word: "SWORD", hint: "The primary weapon of choice for heroes like Kirito in Sword Art Online" },
  { word: "DEMON", hint: "A supernatural evil being that slayers like Tanjiro hunt relentlessly" },
  { word: "GHOST", hint: "An undead spirit — also a legendary Halo Spartan who haunts his foes" },
  { word: "BEAST", hint: "A monstrous transformed state that many shonen protagonists achieve" },
  { word: "PIXEL", hint: "The smallest unit in a digital image — the building block of retro games" },
  { word: "ROGUE", hint: "A stealthy thief class that uses daggers and backstabs in RPGs" },
  { word: "CYBER", hint: "A prefix for futuristic technology-merged worlds like Cyberpunk 2077" },
  { word: "CLOUD", hint: "A spiky-haired mercenary who wields an oversized sword in Midgar" },
  { word: "SONIC", hint: "The fastest hedgehog alive who collects golden rings and battles Eggman" },
  // 6 letters
  { word: "BANKAI", hint: "The final and most powerful release form of a Shinigami's zanpakuto in Bleach" },
  { word: "NARUTO", hint: "A ninja with a nine-tailed fox sealed inside him who dreams of becoming Hokage" },
  { word: "SASUKE", hint: "Naruto's rival who seeks revenge against his brother for massacring his clan" },
  { word: "ITACHI", hint: "A prodigious Uchiha who wiped out his clan to protect his village from war" },
  { word: "SHADOW", hint: "The ultimate lifeform created from Gerald Robotnik's research, rivals Sonic" },
  { word: "CHAKRA", hint: "The life energy in Naruto that ninja mold to perform jutsu techniques" },
  { word: "HUNTER", hint: "A professional who accepts contracts to pursue powerful and dangerous prey" },
  { word: "HOLLOW", hint: "A corrupted spirit in Bleach that devours human souls and threatens the living" },
  { word: "BLEACH", hint: "A shounen anime about a substitute Soul Reaper who fights Hollows in Karakura" },
  { word: "DRAGON", hint: "A mythical fire-breathing creature with scales and wings — slayer awaits" },
  { word: "AVATAR", hint: "One who can master all four elements — Water, Earth, Fire, and Air" },
  { word: "WIZARD", hint: "A master of arcane magic who studies spells and wears robes with a staff" },
  { word: "KNIGHT", hint: "An armored warrior bound by honor who serves a kingdom or a holy cause" },
  { word: "SHIELD", hint: "A defensive weapon — also Captain America's vibranium disc" },
  { word: "LEGEND", hint: "A hero of mythic status whose tales are passed down through generations" },
  { word: "SUKUNA", hint: "The King of Curses with multiple faces and arms inside Yuji Itadori" },
  { word: "MADARA", hint: "The legendary Uchiha who could cast the Infinite Tsukuyomi over the world" },
  { word: "MAKIMA", hint: "A mysterious Control Devil working as a government hunter of Chainsaw Man" },
  // 7 letters
  { word: "SAITAMA", hint: "A hero who trained so hard he lost all his hair and can defeat anyone in one punch" },
  { word: "SHINOBI", hint: "The Japanese word for ninja — a covert warrior of feudal Japan" },
  { word: "PERSONA", hint: "A manifestation of the inner self summoned by JRPG characters using their ego" },
  { word: "WITCHER", hint: "A monster hunter mutated by trials and trained in swordsmanship and signs" },
  { word: "GENSHIN", hint: "An open-world gacha RPG set in Teyvat where you seek your lost sibling" },
  { word: "MONSTER", hint: "A powerful creature that hunters track and slay in the world of Capcom" },
  { word: "PHOENIX", hint: "A mythical fire bird that is reborn from its own ashes upon death" },
  { word: "WARLOCK", hint: "A dark magic user who made a pact with a powerful otherworldly patron" },
  { word: "POKEMON", hint: "Pocket monsters collected and battled by trainers aiming to catch them all" },
  { word: "PALADIN", hint: "A holy warrior combining divine magic and martial prowess to fight evil" },
  // 8 letters
  { word: "BERSERK", hint: "A dark fantasy manga following Guts, a warrior wielding a massive sword" },
  { word: "OVERLORD", hint: "A skeleton MMORPG player who gets trapped in a game as the most powerful being" },
  { word: "PLATINUM", hint: "A precious silver-white metal — also a developer of stylish action games" },
  { word: "ASSASSIN", hint: "A covert killer trained in stealth and silent elimination of targets" },
  { word: "WARRIORS", hint: "Legendary fighters who battle entire armies alone in hack-and-slash games" },
  { word: "INFINITY", hint: "Thanos's goal — collecting all six stones to wipe out half of all life" },
  { word: "VALKYRIE", hint: "Norse warrior maidens who chose which slain soldiers ascended to Valhalla" },
];

/**
 * Fisher-Yates shuffle — returns a new shuffled copy of the array
 */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
      // Directly assign random roles (one Setter, other Guesser) and launch countdown
      startWordGameDirectly(io, roomId, pending.player1, pending.player2);
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

    // Look up the hint for this word from the pool
    const wordEntry = ANIME_GAME_WORDS.find((w) => w.word === cleanWord);
    room.secretHint = wordEntry?.hint || null;

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

  // ─── 6b. GUESSER USES HINT (costs 3 chances — maxChances drops to 5) ───
  socket.on("word_use_hint", ({ roomId }) => {
    const room = activeWordRooms.get(roomId);
    if (!room || room.status !== "guessing") {
      return socket.emit("word_error", { message: "Cannot use hint at this time." });
    }

    if (socket.userId !== room.guesserUserId) {
      return socket.emit("word_error", { message: "Only the Cipher Breaker can use a hint." });
    }

    if (room.hintUsed) {
      return socket.emit("word_error", { message: "Hint already used." });
    }

    if (!room.secretHint) {
      return socket.emit("word_error", { message: "No hint available for this word." });
    }

    room.hintUsed = true;

    // Reduce max chances to 5 (only if guesser hasn't already used more)
    const guesser = room.player1.userId === room.guesserUserId ? room.player1 : room.player2;
    if (guesser.maxChances > 5) {
      guesser.maxChances = 5;
    }
    const newChancesLeft = Math.max(0, guesser.maxChances - guesser.chancesUsed);

    // Send hint to guesser only
    if (guesser.socketId) {
      io.to(guesser.socketId).emit("word_hint_revealed", {
        roomId,
        hintText: room.secretHint,
        newMaxChances: guesser.maxChances,
        chancesLeft: newChancesLeft,
      });
    }

    // Notify setter that hint was used
    const setter = room.player1.userId === room.setterUserId ? room.player1 : room.player2;
    if (setter.socketId) {
      io.to(setter.socketId).emit("word_hint_used_by_guesser", {
        roomId,
        guesserUsername: guesser.username,
        newMaxChances: guesser.maxChances,
        chancesLeft: newChancesLeft,
      });
    }

    // Check if hint reduced chances to 0 or below used amount (game over edge case)
    if (newChancesLeft <= 0 && !guesser.isSolved) {
      resolveWordGame(io, roomId, guesser, setter, false);
    }
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
    if (guesser.chancesUsed >= guesser.maxChances || guesser.isSolved) {
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

  // ─── 9. FORFEIT / SURRENDER ───
  socket.on("word_forfeit", ({ roomId }) => {
    // Check pending matches
    const pending = pendingWordMatches.get(roomId);
    if (pending) {
      clearTimeout(pending.acceptanceTimer);
      pendingWordMatches.delete(roomId);
      io.to(roomId).emit("word_opponent_forfeited", {
        message: "Opponent left the match.",
      });
      return;
    }

    // Check active rooms
    const room = activeWordRooms.get(roomId);
    if (!room) return;

    if (room.roleTimer) clearTimeout(room.roleTimer);
    if (room.botGuessTimer) clearTimeout(room.botGuessTimer);
    if (room.botSetTimer) clearTimeout(room.botSetTimer);

    const p1Id = room.player1?.userId?.toString();
    const myId = userId?.toString();
    const isPlayer1 = p1Id === myId;
    const forfeitingPlayer = isPlayer1 ? room.player1 : room.player2;
    const remainingPlayer = isPlayer1 ? room.player2 : room.player1;

    console.log(`[Word Duel Forfeit] ${forfeitingPlayer?.username} forfeited room ${roomId}`);

    io.to(roomId).emit("word_opponent_forfeited", {
      forfeiterUsername: forfeitingPlayer?.username,
      winnerUsername: remainingPlayer?.username,
      message: `${forfeitingPlayer?.username || "Opponent"} forfeited and exited the duel.`,
    });

    activeWordRooms.delete(roomId);
  });

  // ─── 10. REMATCH REQUEST ───
  socket.on("word_rematch", ({ roomId }) => {
    const room = activeWordRooms.get(roomId);
    if (!room) return;

    if (room.player2.isBot) {
      activeWordRooms.delete(roomId);
      startWordGameDirectly(
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

  // ─── 11. DISCONNECT ───
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
        startWordGameDirectly(io, roomId, p.player1, p.player2);
      }
    }, 1200);
  }
}

/**
 * Directly start word game with randomly assigned roles (Setter vs Guesser)
 * No waiting for role selection! One player randomly gets Setter, the other gets Guesser.
 */
function startWordGameDirectly(io, roomId, player1, player2) {
  // Randomly assign one player as setter, the other as guesser
  const p1IsSetter = Math.random() < 0.5;
  const setterPlayer = p1IsSetter ? player1 : player2;
  const guesserPlayer = p1IsSetter ? player2 : player1;

  const room = {
    roomId,
    player1: {
      userId: player1.userId.toString(),
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
      userId: player2.userId.toString(),
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
    setterUserId: setterPlayer.userId.toString(),
    guesserUserId: guesserPlayer.userId.toString(),
    setter: null,
    guesser: null,
    secretWord: null,
    status: "role_locked",
    roleTimer: null,
    botSetTimer: null,
    botGuessTimer: null,
  };

  room.setter = room.player1.userId === room.setterUserId ? room.player1 : room.player2;
  room.guesser = room.player1.userId === room.guesserUserId ? room.player1 : room.player2;

  activeWordRooms.set(roomId, room);

  console.log(
    `[Word Duel Direct Start] Room ${roomId} => Randomly Assigned: Setter=${room.setter.username} (${room.setterUserId}), Guesser=${room.guesser.username} (${room.guesserUserId})`
  );

  const baseLockedData = {
    roomId,
    setterUserId: room.setterUserId,
    setterUsername: room.setter.username,
    guesserUserId: room.guesserUserId,
    guesserUsername: room.guesser.username,
    pickedByUsername: null,
    chosenRole: "random",
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

  // Directly transition into 3s battle countdown after brief 500ms role broadcast
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
      live.hintUsed = false;
      live.secretHint = null;

      // Pick 10 random word+hint cards for setter to choose from
      const wordCards = shuffleArray(ANIME_GAME_WORDS).slice(0, 10);

      const baseSecretData = {
        roomId,
        setterUserId: live.setterUserId,
        setterUsername: live.setter.username,
        guesserUserId: live.guesserUserId,
        guesserUsername: live.guesser.username,
        suggestedWords: wordCards,
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
          const chosenEntry = ANIME_GAME_WORDS[Math.floor(Math.random() * ANIME_GAME_WORDS.length)];
          live.secretWord = chosenEntry.word;
          live.secretHint = chosenEntry.hint;

          console.log(`[Word Bot Setter] ${live.setter.username} sealed secret word: ${chosenEntry.word}`);

          if (live.guesser.socketId) {
            io.to(live.guesser.socketId).emit("word_secret_ready", {
              roomId,
              setterUsername: live.setter.username,
              wordLength: chosenEntry.word.length,
            });
          }

          checkAndStartGuessingPhase(io, roomId);
        }, 1500);
      }
    }, 3200);
  }, 500);
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
    maxChances: guesser.maxChances,
    hintAvailable: !!room.secretHint,
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
  const chancesLeft = guesser.maxChances - guesser.chancesUsed;
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
  const candidates = ANIME_GAME_WORDS
    .map((e) => e.word)
    .filter((w) => w.length === targetLen);
  if (!candidates.length) candidates.push(room.secretWord);

  const botGuess = () => {
    const currentRoom = activeWordRooms.get(roomId);
    if (!currentRoom || currentRoom.status !== "guessing") return;

    const guesser =
      currentRoom.player1.userId === currentRoom.guesserUserId ? currentRoom.player1 : currentRoom.player2;
    if (guesser.chancesUsed >= guesser.maxChances || guesser.isSolved) return;

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
          if (currentRoom.status === "guessing" && guesser.chancesUsed < guesser.maxChances && !guesser.isSolved) {
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
