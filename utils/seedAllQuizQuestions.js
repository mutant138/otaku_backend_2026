import connectDB from "../db.js";
import { QuizQuestion, AnimeTitle, GameTitle } from "../Models/index.js";
import mongoose from "mongoose";

// High-quality, verified canon trivia questions mapped by Title
const QUIZ_DATA = {
  // === ANIME TITLES ===
  "Demon Slayer": [
    {
      question: "What is the primary Breathing Style used by Tanjiro Kamado originally learned from Sakonji Urokodaki?",
      options: ["Water Breathing", "Sun Breathing", "Flame Breathing", "Thunder Breathing"],
      correctAnswer: "Water Breathing",
      difficulty: "easy",
      explanation: "Tanjiro first mastered Water Breathing from Urokodaki before awakening the Hinokami Kagura (Sun Breathing)."
    },
    {
      question: "Which of the Twelve Kizuki holds the position of Upper Rank One?",
      options: ["Kokushibo", "Akaza", "Doma", "Hantengu"],
      correctAnswer: "Kokushibo",
      difficulty: "medium",
      explanation: "Kokushibo, the Moon Breathing swordsman and twin brother of Yoriichi, is Upper Moon 1."
    },
    {
      question: "What is the name of Zenitsu's single mastered form in Thunder Breathing?",
      options: ["First Form: Thunderclap and Flash", "Second Form: Lightning Ball", "Seventh Form: Honoikazuchi no Kami", "Sixth Form: Rumble and Flash"],
      correctAnswer: "First Form: Thunderclap and Flash",
      difficulty: "medium",
      explanation: "Zenitsu initially only mastered the First Form: Thunderclap and Flash, perfecting it to godspeed levels."
    },
    {
      question: "What flower is known to be the weakness/cure sought by Muzan Kibutsuji?",
      options: ["Blue Spider Lily", "Red Moon Blossom", "Sunfire Orchid", "Wisteria Rose"],
      correctAnswer: "Blue Spider Lily",
      difficulty: "easy",
      explanation: "Muzan has been searching for centuries for the elusive Blue Spider Lily to achieve complete immortality under the sun."
    },
    {
      question: "What is Inosuke Hashibira's self-taught Breathing Style?",
      options: ["Beast Breathing", "Wind Breathing", "Sound Breathing", "Stone Breathing"],
      correctAnswer: "Beast Breathing",
      difficulty: "easy",
      explanation: "Inosuke developed Beast Breathing on his own while surviving in the harsh mountains."
    }
  ],
  "Frieren": [
    {
      question: "How long did the Hero Party spend traveling to defeat the Demon King?",
      options: ["10 Years", "5 Years", "20 Years", "1 Year"],
      correctAnswer: "10 Years",
      difficulty: "easy",
      explanation: "The journey of the Hero Party led by Himmel took 10 years, which Frieren considered a mere fraction of her lifespan."
    },
    {
      question: "What is the name of Frieren's legendary elf master who created humanity's magic foundations?",
      options: ["Flamme", "Serie", "Fern", "Kraft"],
      correctAnswer: "Flamme",
      difficulty: "medium",
      explanation: "Great Mage Flamme took Frieren in as her apprentice and established modern magic."
    },
    {
      question: "What is Frieren's favorite everyday hobby when exploring dungeons and towns?",
      options: ["Collecting eccentric and mundane grimoires", "Brewing magical potions", "Mining mana crystals", "Forging enchanted staves"],
      correctAnswer: "Collecting eccentric and mundane grimoires",
      difficulty: "easy",
      explanation: "Frieren loves collecting weird spells, like making clothes clean or blooming fields of flowers."
    },
    {
      question: "What offensive spell does Fern specialize in casting at extreme speeds?",
      options: ["Zoltraak (Soul Track)", "Hellfire Burst", "Judgement Arrow", "Absolute Zero"],
      correctAnswer: "Zoltraak (Soul Track)",
      difficulty: "medium",
      explanation: "Fern perfected standard offensive magic (Zoltraak), firing it faster and with greater mana control than most mages."
    }
  ],
  "Death Note": [
    {
      question: "What is the favorite human food of the Shinigami Ryuk?",
      options: ["Apples", "Strawberries", "Chocolates", "Pears"],
      correctAnswer: "Apples",
      difficulty: "easy",
      explanation: "Ryuk is notoriously addicted to juicy red Earth apples, suffering withdrawal symptoms without them."
    },
    {
      question: "What is the pseudonym used by the master detective investigating Kira?",
      options: ["L", "Near", "Mello", "Watari"],
      correctAnswer: "L",
      difficulty: "easy",
      explanation: "L Lawliet operated under the alias 'L' as the world's premier consulting detective."
    },
    {
      question: "What must a human trade to acquire the Shinigami Eyes?",
      options: ["Half of their remaining lifespan", "Their sense of taste", "10 years of life", "Their soul upon death"],
      correctAnswer: "Half of their remaining lifespan",
      difficulty: "medium",
      explanation: "The eye deal costs half of the person's remaining lifespan in exchange for seeing names and life spans."
    }
  ],
  "Hunter x Hunter (2011)": [
    {
      question: "What Nen category does Gon Freecss naturally belong to?",
      options: ["Enhancement", "Transmutation", "Conjuration", "Specialization"],
      correctAnswer: "Enhancement",
      difficulty: "easy",
      explanation: "Gon is a natural Enhancer, giving his Jajanken Rock destructive physical power."
    },
    {
      question: "What are the two properties of Hisoka's Nen ability, Bungee Gum?",
      options: ["Rubber and Gum", "Fire and Ice", "Magnetism and Steel", "Silk and Venom"],
      correctAnswer: "Rubber and Gum",
      difficulty: "easy",
      explanation: "As Hisoka constantly repeats, Bungee Gum possesses the properties of both rubber and gum."
    },
    {
      question: "What is Killua Zoldyck's ultimate electric Nen mode called?",
      options: ["Godspeed (Kanmuru)", "Thunderbolt", "Lightning Palm", "Storm Surge"],
      correctAnswer: "Godspeed (Kanmuru)",
      difficulty: "medium",
      explanation: "Kanmuru (Godspeed) allows Killua to react instantaneously by sending electrical Nen signals directly to his muscles."
    }
  ],
  "Steins;Gate": [
    {
      question: "What everyday appliance was modified to create the D-Mail time machine?",
      options: ["Microwave (Name Subject to Change)", "Toaster", "Refrigerator", "Washing Machine"],
      correctAnswer: "Microwave (Name Subject to Change)",
      difficulty: "easy",
      explanation: "The Future Gadget Lab's PhoneWave (name subject to change) was their makeshift time leap device."
    },
    {
      question: "What chuunibyou alter ego does Rintaro Okabe call himself?",
      options: ["Kyoma Hououin", "John Titor", "Kyouka", "Mad Scientist 001"],
      correctAnswer: "Kyoma Hououin",
      difficulty: "easy",
      explanation: "Okabe claims to be the insane mad scientist Kyoma Hououin fighting against 'the Organization'."
    },
    {
      question: "What is Okabe's unique ability to retain memories across divergent worldlines?",
      options: ["Reading Steiner", "Time Leap", "Worldline Shift", "Temporal Anchor"],
      correctAnswer: "Reading Steiner",
      difficulty: "medium",
      explanation: "Reading Steiner allows Okabe to remember events from other timelines when the worldline changes."
    }
  ],
  "Code Geass: Lelouch of the Rebellion": [
    {
      question: "What is Lelouch vi Britannia's vigilante alter-ego and leader of the Black Knights?",
      options: ["Zero", "Suzaku", "L.L.", "Emperor Julius"],
      correctAnswer: "Zero",
      difficulty: "easy",
      explanation: "Lelouch dons the masked persona Zero to spearhead the rebellion against Britannia."
    },
    {
      question: "What absolute command power does Lelouch's Geass grant him?",
      options: ["Absolute Obedience", "Mind Reading", "Future Sight", "Teleportation"],
      correctAnswer: "Absolute Obedience",
      difficulty: "easy",
      explanation: "Lelouch's Geass forces any person who makes direct eye contact with him to obey any single command without question."
    }
  ],
  "Mob Psycho 100": [
    {
      question: "What is Shigeo Kageyama's nickname?",
      options: ["Mob", "Psycho", "White T-Poison", "Esper One"],
      correctAnswer: "Mob",
      difficulty: "easy",
      explanation: "Shigeo is called Mob because his lack of presence makes him blend into background crowds."
    },
    {
      question: "Who is Mob's con-artist master and self-proclaimed greatest psychic of the 21st century?",
      options: ["Arataka Reigen", "Teruki Hanazawa", "Katsuya Serizawa", "Keiji Mogami"],
      correctAnswer: "Arataka Reigen",
      difficulty: "easy",
      explanation: "Reigen runs the Spirits and Such Consultation Office with zero psychic powers of his own."
    }
  ],
  "Bocchi the Rock!": [
    {
      question: "What is Hitori Gotoh's nickname in Kessoku Band?",
      options: ["Bocchi", "Nijika", "Ryo", "Kita"],
      correctAnswer: "Bocchi",
      difficulty: "easy",
      explanation: "Ryo gave Hitori Gotoh the nickname 'Bocchi', short for Hitoribocchi."
    },
    {
      question: "What instrument does Bocchi play?",
      options: ["Lead Guitar", "Bass Guitar", "Drums", "Vocals & Keyboard"],
      correctAnswer: "Lead Guitar",
      difficulty: "easy",
      explanation: "Bocchi plays lead guitar on her Gibson Les Paul Custom."
    }
  ],
  "Oshi no Ko": [
    {
      question: "What is the name of the legendary idol of B-Komachi who is the mother of Aqua and Ruby?",
      options: ["Ai Hoshino", "Kana Arima", "Akane Kurokawa", "Mem-Cho"],
      correctAnswer: "Ai Hoshino",
      difficulty: "easy",
      explanation: "Ai Hoshino is the star idol with star-shaped eyes whose legacy drives the entire story."
    },
    {
      question: "What was Aqua's profession in his previous life before reincarnating?",
      options: ["Obstetrician/Gynecologist Doctor (Gorou)", "High School Student", "Talent Agent", "Detective"],
      correctAnswer: "Obstetrician/Gynecologist Doctor (Gorou)",
      difficulty: "medium",
      explanation: "Gorou Amamiya was Ai's attending doctor in rural Miyazaki before being murdered and reincarnated as Aqua."
    }
  ],
  "JoJo's Bizarre Adventure": [
    {
      question: "What is the name of Jotaro Kujo's Stand in Part 3: Stardust Crusaders?",
      options: ["Star Platinum", "Crazy Diamond", "Gold Experience", "Silver Chariot"],
      correctAnswer: "Star Platinum",
      difficulty: "easy",
      explanation: "Jotaro wields Star Platinum, known for its superhuman speed, power, precision, and 'ORA ORA' barrage."
    },
    {
      question: "What is the battle cry of DIO's Stand, The World?",
      options: ["MUDA MUDA MUDA", "ORA ORA ORA", "DORARARA", "ARI ARI ARI"],
      correctAnswer: "MUDA MUDA MUDA",
      difficulty: "easy",
      explanation: "DIO screams 'MUDA MUDA MUDA!' (Useless!) when delivering barrages with The World."
    }
  ],
  "Re:Zero - Starting Life in Another World": [
    {
      question: "What is Subaru Natsuki's curse/ability that resets time upon death?",
      options: ["Return by Death", "Time Leap", "Save Point Resurrection", "Shadow Step"],
      correctAnswer: "Return by Death",
      difficulty: "easy",
      explanation: "Subaru is bestowed 'Return by Death' by the Witch of Envy."
    },
    {
      question: "Who is the silver-haired half-elf candidate for the throne of Lugnica supported by Subaru?",
      options: ["Emilia", "Rem", "Ram", "Crusch Karsten"],
      correctAnswer: "Emilia",
      difficulty: "easy",
      explanation: "Subaru is deeply devoted to Emilia (Lia), a kind half-elf spirit arts user."
    }
  ],
  "That Time I Got Reincarnated as a Slime": [
    {
      question: "What was Rimuru Tempest's original human name before being reincarnated?",
      options: ["Satoru Mikami", "Kazuma Sato", "Subaru Natsuki", "Hachiman Hikigaya"],
      correctAnswer: "Satoru Mikami",
      difficulty: "medium",
      explanation: "Rimuru lived as 37-year-old corporate worker Satoru Mikami before being reincarnated."
    },
    {
      question: "What AI-like intrinsic skill guides Rimuru with calculations and analysis?",
      options: ["Great Sage (Raphael)", "Omniscience", "Predator", "Gluttony"],
      correctAnswer: "Great Sage (Raphael)",
      difficulty: "easy",
      explanation: "Great Sage assists Rimuru with voice advice, tactical synthesis, and spell analysis."
    }
  ],
  "The Eminence in Shadow": [
    {
      question: "What is Cid Kagenou's signature ultimate destructive spell?",
      options: ["I Am Atomic", "Shadow Flare", "Dimension Slash", "Dark Nebula"],
      correctAnswer: "I Am Atomic",
      difficulty: "easy",
      explanation: "Cid unleashes 'I Am Atomic', a blast so powerful it vaporizes entire city blocks with a purple shockwave."
    }
  ],
  "Kaiju No. 8": [
    {
      question: "What is Kafka Hibino's main job before joining the Defense Force?",
      options: ["Monster Sweeper (Kaiju Clean-up Worker)", "City Guard", "Construction Engineer", "Science Researcher"],
      correctAnswer: "Monster Sweeper (Kaiju Clean-up Worker)",
      difficulty: "easy",
      explanation: "Kafka worked for Monster Sweeper Inc., dismantling and cleaning up kaiju carcasses."
    }
  ],
  "Dandadan": [
    {
      question: "What does Momo Ayase believe in, in contrast to Ken Takakura (Okarun)?",
      options: ["Ghosts (not Aliens)", "Aliens (not Ghosts)", "Superheroes", "Time Travel"],
      correctAnswer: "Ghosts (not Aliens)",
      difficulty: "easy",
      explanation: "Momo staunchly believes in spirits/ghosts, while Okarun believes in UFOs and extraterrestrials."
    }
  ],
  "Horimiya": [
    {
      question: "What hidden secret does Izumi Miyamura hide beneath his school uniform and long hair?",
      options: ["Tattoos and multiple body piercings", "A secret delinquent gang leader identity", "Professional modeling career", "A manga artist alias"],
      correctAnswer: "Tattoos and multiple body piercings",
      difficulty: "easy",
      explanation: "Outside of school, Miyamura has ear and lip piercings and large tattoos on his back and side."
    },
    {
      question: "Who is Kyouko Hori's younger brother whom Miyamura walked home after an accident?",
      options: ["Souta", "Yuki", "Toru", "Shu"],
      correctAnswer: "Souta",
      difficulty: "easy",
      explanation: "Miyamura helped young Souta Hori after he got a nosebleed, introducing him to Kyouko's true home life."
    }
  ],
  "Your Name.": [
    {
      question: "What are the names of the two protagonists who swap bodies across time in Makoto Shinkai's Your Name?",
      options: ["Taki Tachibana and Mitsuha Miyamizu", "Hodaka and Hina", "Souta and Suzume", "Takao and Yukino"],
      correctAnswer: "Taki Tachibana and Mitsuha Miyamizu",
      difficulty: "easy",
      explanation: "Taki (in Tokyo) and Mitsuha (in rural Itomori) swap bodies across a 3-year time disparity."
    },
    {
      question: "What celestial event split in the night sky over the town of Itomori?",
      options: ["Tiamat Comet", "Halley's Comet", "Solar Eclipse", "Supernova"],
      correctAnswer: "Tiamat Comet",
      difficulty: "easy",
      explanation: "A fragment of the Tiamat Comet broke off and struck Itomori during the autumn festival."
    }
  ],
  "A Silent Voice": [
    {
      question: "What disability does Shoko Nishimiya have in A Silent Voice (Koe no Katachi)?",
      options: ["Congenital Deafness (Hearing Impairment)", "Visual Impairment (Blindness)", "Mutism", "Mobility Impairment"],
      correctAnswer: "Congenital Deafness (Hearing Impairment)",
      difficulty: "easy",
      explanation: "Shoko is deaf and uses a notebook and Japanese Sign Language (JSL) to communicate."
    },
    {
      question: "What visual symbol does Shoya Ishida see over the faces of people he is too anxious to look at?",
      options: ["Blue X's across their faces", "Black smoke", "Cracked glass", "Question marks"],
      correctAnswer: "Blue X's across their faces",
      difficulty: "easy",
      explanation: "Shoya visualizes big blue 'X' stickers over the faces of classmates representing his social isolation and guilt."
    }
  ],
  "Classroom of the Elite": [
    {
      question: "What class is Kiyotaka Ayanokoji placed in upon entering Advanced Nurturing High School?",
      options: ["Class 1-D", "Class 1-A", "Class 1-B", "Class 1-C"],
      correctAnswer: "Class 1-D",
      difficulty: "easy",
      explanation: "Ayanokoji is placed in Class 1-D, the designated 'defective' class."
    }
  ],

  // === GAME TITLES ===
  "Minecraft": [
    {
      question: "What material is required to construct the frame of a Nether Portal?",
      options: ["Obsidian", "Bedrock", "Crying Obsidian", "Netherrack"],
      correctAnswer: "Obsidian",
      difficulty: "easy",
      explanation: "A Nether Portal frame requires at least 10 blocks of Obsidian ignited with flint and steel."
    },
    {
      question: "What boss mob must be defeated in The End dimension to see the game's victory poem?",
      options: ["Ender Dragon", "Wither", "Elder Guardian", "Warden"],
      correctAnswer: "Ender Dragon",
      difficulty: "easy",
      explanation: "Slaying the Ender Dragon opens the exit portal back to the Overworld."
    },
    {
      question: "What ore is used to upgrade Diamond gear to the highest tier in Minecraft?",
      options: ["Netherite Ingot", "Emerald", "Amethyst Shard", "Redstone"],
      correctAnswer: "Netherite Ingot",
      difficulty: "easy",
      explanation: "Combining Diamond gear with a Netherite Ingot at a Smithing Table creates fireproof Netherite gear."
    }
  ],
  "Genshin Impact": [
    {
      question: "What is the name of the floating fairy companion and emergency food guide in Teyvat?",
      options: ["Paimon", "Guoba", "Barbatos", "Klee"],
      correctAnswer: "Paimon",
      difficulty: "easy",
      explanation: "Paimon is the Traveler's talkative guide throughout their journey."
    },
    {
      question: "Who is the Archon of Geo and protector of Liyue Harbor?",
      options: ["Zhongli (Morax)", "Venti (Barbatos)", "Raiden Shogun (Beelzebul)", "Nahida (Buer)"],
      correctAnswer: "Zhongli (Morax)",
      difficulty: "easy",
      explanation: "Zhongli is the mortal vessel of Morax, the Prime of Adepti and Geo Archon."
    },
    {
      question: "What is the elemental reaction caused by combining Pyro and Hydro?",
      options: ["Vaporize", "Melt", "Overloaded", "Electro-Charged"],
      correctAnswer: "Vaporize",
      difficulty: "medium",
      explanation: "Vaporize deals 1.5x to 2.0x damage multiplier depending on whether Hydro or Pyro triggers it."
    }
  ],
  "Honkai: Star Rail": [
    {
      question: "What is the name of the cosmic train that travels across star systems in Honkai: Star Rail?",
      options: ["Astral Express", "Hyperion", "Starlight Ark", "Cosmic Voyager"],
      correctAnswer: "Astral Express",
      difficulty: "easy",
      explanation: "The Astral Express was created by Akivili the Trailblaze."
    },
    {
      question: "What is sealed inside the Trailblazer protagonist at the start of the story?",
      options: ["A Stellaron (Cancer of All Worlds)", "An Aeon's Core", "A Herrscher Gem", "A Divine Key"],
      correctAnswer: "A Stellaron (Cancer of All Worlds)",
      difficulty: "medium",
      explanation: "Kafka and Silver Wolf embed a Stellaron into the Trailblazer's body during the prologue."
    }
  ],
  "Zenless Zone Zero": [
    {
      question: "What are the dangerous supernatural disaster zones called in New Eridu?",
      options: ["Hollows", "Rifts", "Abysses", "Singularities"],
      correctAnswer: "Hollows",
      difficulty: "easy",
      explanation: "Hollows are spatial anomalies infested with monstrous creatures known as Ethereals."
    },
    {
      question: "What are the small rabbit-like AI assistants used to navigate Hollows?",
      options: ["Bangboo", "W-Engine", "Chocobo", "Moogle"],
      correctAnswer: "Bangboo",
      difficulty: "easy",
      explanation: "Bangboo are sentient miniature utility automata that accompany agents into Hollows."
    }
  ],
  "Wuthering Waves": [
    {
      question: "What are the playable resonator characters that utilize sound frequencies called?",
      options: ["Resonators", "Awakeners", "Conductors", "Echoes"],
      correctAnswer: "Resonators",
      difficulty: "easy",
      explanation: "Resonators possess Forte abilities allowing them to manipulate soundwave frequencies."
    },
    {
      question: "What can players capture from defeated monsters to equip for stats and active skills?",
      options: ["Echoes", "Spirits", "Relics", "Glyphs"],
      correctAnswer: "Echoes",
      difficulty: "easy",
      explanation: "Echoes are frequency imprints left by monsters that can be equipped in combat."
    }
  ],
  "Tekken 8": [
    {
      question: "Who is the main protagonist of Tekken 8 fighting to rid the world of the Devil Gene?",
      options: ["Jin Kazama", "Kazuya Mishima", "Heihachi Mishima", "Lars Alexandersson"],
      correctAnswer: "Jin Kazama",
      difficulty: "easy",
      explanation: "Jin Kazama harnesses his Kazama and Devil heritage to battle his father Kazuya Mishima."
    },
    {
      question: "What is the new aggressive combat mechanic introduced in Tekken 8?",
      options: ["Heat System", "Rage Drive", "Focus Attack", "Drive Rush"],
      correctAnswer: "Heat System",
      difficulty: "easy",
      explanation: "The Heat System activates Heat State, granting chip damage and special Heat Smashes."
    }
  ],
  "Cyberpunk 2077": [
    {
      question: "What legendary rockstar and terrorist is stored on the biochip in V's head?",
      options: ["Johnny Silverhand", "Kerry Eurodyne", "Rogue Amendiares", "Morgan Blackhand"],
      correctAnswer: "Johnny Silverhand",
      difficulty: "easy",
      explanation: "Keanu Reeves portrays Johnny Silverhand, the rebellious frontman of SAMURAI on the Relic."
    },
    {
      question: "What mega-corporation created the Relic biochip and dominates Night City?",
      options: ["Arasaka", "Militech", "Kang Tao", "Biotechnica"],
      correctAnswer: "Arasaka",
      difficulty: "easy",
      explanation: "Arasaka Corporation is the Japanese weapons and security monolith led by Saburo Arasaka."
    }
  ],
  "Grand Theft Auto VI": [
    {
      question: "What fictional state and sun-soaked city will GTA VI return players to?",
      options: ["Leonida (Vice City)", "San Andreas (Los Santos)", "Liberty State (Liberty City)", "Alderney"],
      correctAnswer: "Leonida (Vice City)",
      difficulty: "easy",
      explanation: "Grand Theft Auto VI is set in the neon-soaked state of Leonida, home to Vice City."
    },
    {
      question: "Who is the first named female dual-protagonist revealed in the GTA VI debut trailer?",
      options: ["Lucia", "Catalina", "Mercedes", "Tracey"],
      correctAnswer: "Lucia",
      difficulty: "easy",
      explanation: "Lucia stars alongside her partner in a Bonnie-and-Clyde style crime saga."
    }
  ],
  "Grand Theft Auto: San Andreas": [
    {
      question: "Who is the protagonist returning to Los Santos in GTA: San Andreas after his mother's murder?",
      options: ["Carl 'CJ' Johnson", "Big Smoke", "Ryder", "Sweet Johnson"],
      correctAnswer: "Carl 'CJ' Johnson",
      difficulty: "easy",
      explanation: "CJ returns to Grove Street to reunite with his family and rebuild the Grove Street Families."
    },
    {
      question: "What is Big Smoke's infamous drive-thru order at Cluckin' Bell?",
      options: ["Two number 9s, a number 9 large, a number 6 with extra dip...", "Three double cheeseburgers and large fries", "Two number 4s and a diet soda", "A bucket of crispy wings"],
      correctAnswer: "Two number 9s, a number 9 large, a number 6 with extra dip...",
      difficulty: "easy",
      explanation: "Big Smoke's legendary colossal meal order is one of the most celebrated memes in gaming history."
    }
  ],
  "Grand Theft Auto: Vice City": [
    {
      question: "Who is the Hawaiian-shirt wearing protagonist of GTA: Vice City voiced by Ray Liotta?",
      options: ["Tommy Vercetti", "Lance Vance", "Ricardo Diaz", "Sonny Forelli"],
      correctAnswer: "Tommy Vercetti",
      difficulty: "easy",
      explanation: "Tommy Vercetti takes over the 1980s criminal underworld of Vice City."
    },
    {
      question: "What is the name of Tommy Vercetti's iconic sprawling mansion acquired after defeating Ricardo Diaz?",
      options: ["Vercetti Estate (Diaz Mansion)", "Ocean View Hotel", "Starfish Palace", "Malibu Club"],
      correctAnswer: "Vercetti Estate (Diaz Mansion)",
      difficulty: "medium",
      explanation: "Tommy takes over Ricardo Diaz's massive Starfish Island estate, renaming it the Vercetti Estate."
    }
  ],
  "Call of Duty: Warzone": [
    {
      question: "What is the 1v1 respawn arena where eliminated players fight for a second chance?",
      options: ["The Gulag", "The Pit", "The Armory", "The Dropzone"],
      correctAnswer: "The Gulag",
      difficulty: "easy",
      explanation: "Fallen operators are thrown into the Gulag for a tense 1v1 gunfight to earn redeployment."
    },
    {
      question: "What was the original legendary Verdansk battle royale map named?",
      options: ["Verdansk", "Caldera", "Al Mazrah", "Urzikstan"],
      correctAnswer: "Verdansk",
      difficulty: "easy",
      explanation: "Verdansk was the iconic launch map of Call of Duty: Warzone in 2020."
    }
  ],
  "Call of Duty: Black Ops 6": [
    {
      question: "What revolutionary 360-degree movement system is introduced in Black Ops 6?",
      options: ["Omnimovement", "Exo-Jump", "Wall-Running", "Slide Cancel Pro"],
      correctAnswer: "Omnimovement",
      difficulty: "easy",
      explanation: "Omnimovement allows players to sprint, slide, and dive seamlessly in any direction (forward, sideways, backwards)."
    },
    {
      question: "What historical geopolitical era serves as the backdrop for Black Ops 6?",
      options: ["Early 1990s Gulf War / Post-Cold War", "Vietnam War 1968", "World War II 1944", "Near-Future 2065"],
      correctAnswer: "Early 1990s Gulf War / Post-Cold War",
      difficulty: "medium",
      explanation: "Black Ops 6 takes place in the early 1990s following the dissolution of the Soviet Union and during the Gulf War."
    }
  ],
  "Dota 2": [
    {
      question: "What ancient tournament is considered the annual world championship of Dota 2?",
      options: ["The International (TI)", "Dota Major League", "The Aegis Cup", "Worlds"],
      correctAnswer: "The International (TI)",
      difficulty: "easy",
      explanation: "Valve's The International (TI) awards the coveted Aegis of Champions and historic multimillion-dollar prize pools."
    },
    {
      question: "What legendary neutral boss monster drops the Aegis of the Immortal in Dota 2?",
      options: ["Roshan", "Baron Nashor", "Tormentor", "Ancient Dragon"],
      correctAnswer: "Roshan",
      difficulty: "easy",
      explanation: "Killing Roshan in his pit grants the Aegis of the Immortal, reviving the holder upon death."
    }
  ],
  "PUBG: Battlegrounds": [
    {
      question: "What celebratory phrase appears on the victory screen in PUBG?",
      options: ["Winner Winner Chicken Dinner!", "Victory Royale!", "Champion of the Arena!", "Flawless Victory!"],
      correctAnswer: "Winner Winner Chicken Dinner!",
      difficulty: "easy",
      explanation: "The iconic post-match victory screen in PUBG displays 'Winner Winner Chicken Dinner!'"
    },
    {
      question: "What melee weapon in PUBG can famously deflect bullets and save your life?",
      options: ["Cast Iron Frying Pan", "Crowbar", "Machete", "Sickle"],
      correctAnswer: "Cast Iron Frying Pan",
      difficulty: "easy",
      explanation: "The level 4 armor frying pan on your waist deflects sniper rounds and bullets."
    }
  ],
  "Free Fire": [
    {
      question: "What famous active skill DJ character in Free Fire creates a 5m aura that restores HP and boosts speed?",
      options: ["Alok (Drop the Beat)", "Chrono", "K (Master of All)", "Dimitri"],
      correctAnswer: "Alok (Drop the Beat)",
      difficulty: "easy",
      explanation: "DJ Alok is one of the most iconic characters in Free Fire, providing movement speed and healing."
    },
    {
      question: "What temporary throwable shield wall is essential for surviving open gunfights in Free Fire?",
      options: ["Gloo Wall", "Riot Shield", "Titan Dome", "Ice Barrier"],
      correctAnswer: "Gloo Wall",
      difficulty: "easy",
      explanation: "Gloo Walls are instant deployable ice barriers used as cover during duels."
    }
  ],
  "Apex Legends": [
    {
      question: "Which Legend can open dimensional rifts and hear voices from the Void?",
      options: ["Wraith", "Horizon", "Octane", "Pathfinder"],
      correctAnswer: "Wraith",
      difficulty: "easy",
      explanation: "Wraith uses Phase Walking and Dimensional Rifts to reposition her squad."
    }
  ],
  "Overwatch 2": [
    {
      question: "What is Tracer's iconic catchphrase when blinking into battle?",
      options: ["Cheers, love! The cavalry's here!", "Justice rains from above!", "Heroes never die!", "Nerf this!"],
      correctAnswer: "Cheers, love! The cavalry's here!",
      difficulty: "easy",
      explanation: "Tracer's signature greeting is 'Cheers, love! The cavalry's here!'"
    }
  ],
  "Rainbow Six Siege": [
    {
      question: "What is the defensive drone-jamming and signal-disrupting operator from SAS?",
      options: ["Mute", "Smoke", "Jäger", "Bandit"],
      correctAnswer: "Mute",
      difficulty: "easy",
      explanation: "Mute places GC90 Moni Signal Disruptors to jam attacker scouting drones and breach remotes."
    },
    {
      question: "Which heavy attacker uses a specialized sledgehammer to breach soft walls and barricades?",
      options: ["Sledge", "Thermite", "Ash", "Buck"],
      correctAnswer: "Sledge",
      difficulty: "easy",
      explanation: "Seamus Cowden (Sledge) breaches walls and castle barricades with his Tactical Breaching Hammer."
    }
  ],
  "Baldur's Gate 3": [
    {
      question: "What tabletop RPG ruleset is Baldur's Gate 3 based on?",
      options: ["Dungeons & Dragons 5th Edition (D&D 5e)", "Pathfinder 2e", "Call of Cthulhu", "Warhammer 40k"],
      correctAnswer: "Dungeons & Dragons 5th Edition (D&D 5e)",
      difficulty: "easy",
      explanation: "Larian Studios built Baldur's Gate 3 directly on the D&D 5e mechanics."
    }
  ],
  "Palworld": [
    {
      question: "What item is crafted and thrown to capture wild Pals in Palworld?",
      options: ["Pal Sphere", "Poke Ball", "Monster Cage", "Capture Net"],
      correctAnswer: "Pal Sphere",
      difficulty: "easy",
      explanation: "Pal Spheres are crafted using Paldium Fragments to capture wild creatures."
    }
  ],
  "Persona 5 Royal": [
    {
      question: "What is the codename of the protagonist and leader of the Phantom Thieves?",
      options: ["Joker", "Skull", "Mona", "Fox"],
      correctAnswer: "Joker",
      difficulty: "easy",
      explanation: "Ren Amamiya adopts the code name Joker when invading cognitive Palaces."
    }
  ],
  "Persona 3 Reload": [
    {
      question: "What gun-like device do S.E.E.S. members use on themselves to summon their Personas?",
      options: ["Evoker", "Metaverse Nav", "Morpher", "Compendium Trigger"],
      correctAnswer: "Evoker",
      difficulty: "easy",
      explanation: "The Evoker triggers extreme emotional duress through mock gunshots to awaken and manifest Personas."
    },
    {
      question: "What hidden 25th hour occurs every midnight when normal humans transmute into coffins?",
      options: ["The Dark Hour", "The Midnight Channel", "The Eclipse", "Tartarus Phase"],
      correctAnswer: "The Dark Hour",
      difficulty: "easy",
      explanation: "The Dark Hour occurs at midnight, revealing the shifting labyrinth tower of Tartarus."
    }
  ],
  "Final Fantasy VII Rebirth": [
    {
      question: "What iconic oversized sword does Cloud Strife carry into battle?",
      options: ["Buster Sword", "Masamune", "Gunblade", "Brotherhood"],
      correctAnswer: "Buster Sword",
      difficulty: "easy",
      explanation: "The Buster Sword was passed down from Angeal to Zack, and finally to Cloud."
    }
  ],
  "Monster Hunter: World": [
    {
      question: "What flying wyvern known as the 'King of the Skies' is the flagship monster of Monster Hunter?",
      options: ["Rathalos", "Diablos", "Nergigante", "Anjanath"],
      correctAnswer: "Rathalos",
      difficulty: "easy",
      explanation: "Rathalos is the fire-breathing apex predator of the Ancient Forest and series mascot."
    },
    {
      question: "What is the name of your loyal feline companion who cooks and aids you in hunts?",
      options: ["Palico", "Palamute", "Chocobo", "Moogle"],
      correctAnswer: "Palico",
      difficulty: "easy",
      explanation: "Palicoes are intelligent Felyne comrades who heal you and carry support gadgets."
    }
  ],
  "The Legend of Zelda: Tears of the Kingdom": [
    {
      question: "What ability allows Link to attach materials to weapons and shields to increase their power?",
      options: ["Fuse", "Ultrahand", "Ascend", "Recall"],
      correctAnswer: "Fuse",
      difficulty: "easy",
      explanation: "Fuse combines monster horns and materials onto weapons and shields."
    }
  ],
  "The Legend of Zelda: Breath of the Wild": [
    {
      question: "How many Spirit Orbs from Sheikah Shrines are required to upgrade a Heart Container or Stamina Vessel?",
      options: ["4 Spirit Orbs", "3 Spirit Orbs", "5 Spirit Orbs", "10 Spirit Orbs"],
      correctAnswer: "4 Spirit Orbs",
      difficulty: "easy",
      explanation: "Praying at Goddess Statues with 4 Spirit Orbs allows Link to choose extra Health or Stamina."
    },
    {
      question: "What ancient tablet does Link carry that grants Stasis, Magnesis, Cryonis, and Remote Bombs?",
      options: ["Sheikah Slate", "Purah Pad", "Ocarina of Time", "Wind Waker"],
      correctAnswer: "Sheikah Slate",
      difficulty: "easy",
      explanation: "The Sheikah Slate acts as Link's multipurpose magic tool throughout BotW."
    }
  ],
  "Street Fighter 6": [
    {
      question: "What is Ryu and Ken's iconic dragon punch rising uppercut technique?",
      options: ["Shoryuken", "Hadoken", "Tatsumaki Senpukyaku", "Shinryuken"],
      correctAnswer: "Shoryuken",
      difficulty: "easy",
      explanation: "Shoryuken ('Rising Dragon Fist') is the definitive anti-air uppercut in fighting games."
    },
    {
      question: "What universal meter system governs Drive Impact, Drive Parry, and Drive Rush in SF6?",
      options: ["Drive Gauge", "V-Trigger", "Focus Meter", "Ultra Gauge"],
      correctAnswer: "Drive Gauge",
      difficulty: "easy",
      explanation: "The 6-bar Drive Gauge powers all offensive and defensive mechanics in Street Fighter 6."
    }
  ],
  "Dragon Ball: Sparking! ZERO": [
    {
      question: "What legendary fighting game series is Dragon Ball: Sparking! ZERO the direct sequel to?",
      options: ["Budokai Tenkaichi (Tenkaichi 3)", "Budokai 3", "Xenoverse 2", "Raging Blast"],
      correctAnswer: "Budokai Tenkaichi (Tenkaichi 3)",
      difficulty: "easy",
      explanation: "Sparking! ZERO is the long-awaited 4th installment of the Budokai Tenkaichi arena fighter series."
    },
    {
      question: "How many playable roster characters with transformations were featured at launch in Sparking! ZERO?",
      options: ["Over 180 Characters", "Around 50 Characters", "100 Characters", "75 Characters"],
      correctAnswer: "Over 180 Characters",
      difficulty: "medium",
      explanation: "Sparking! ZERO launched with a record-shattering roster of 182 characters from Z, Super, GT, and Movies."
    }
  ],
  "Dragon Ball FighterZ": [
    {
      question: "What type of team battle format does Dragon Ball FighterZ use?",
      options: ["3 vs 3 Tag Team", "1 vs 1", "2 vs 2", "4 vs 4"],
      correctAnswer: "3 vs 3 Tag Team",
      difficulty: "easy",
      explanation: "Dragon Ball FighterZ is an Arc System Works 3v3 tag-team assist fighter."
    },
    {
      question: "Who is the main original android antagonist created by Akira Toriyama for FighterZ?",
      options: ["Android 21", "Android 13", "Android 20 (Dr. Gero)", "Mira"],
      correctAnswer: "Android 21",
      difficulty: "easy",
      explanation: "Android 21 is a brilliant scientist and Majin hybrid who craves sweet treats."
    }
  ],
  "Naruto Shippuden: Ultimate Ninja Storm 4": [
    {
      question: "What ultimate team mechanic lets players swap out their active point fighter mid-combo?",
      options: ["Leader Change System", "Support Burst", "Awakening Action", "Ninja Dash Swap"],
      correctAnswer: "Leader Change System",
      difficulty: "easy",
      explanation: "Storm 4 introduced the Leader Swap mechanic, allowing seamless mid-combo character tag-ins."
    },
    {
      question: "Who is the final boss of the Fourth Great Ninja War campaign in Storm 4?",
      options: ["Kaguya Otsutsuki", "Madara Uchiha", "Obito Uchiha", "Sasuke Uchiha"],
      correctAnswer: "Kaguya Otsutsuki",
      difficulty: "easy",
      explanation: "Team 7 unites to seal the Mother of Chakra, Kaguya Otsutsuki, across multiple dimensions."
    }
  ],
  "Red Dead Redemption 2": [
    {
      question: "Who is the main protagonist of Red Dead Redemption 2?",
      options: ["Arthur Morgan", "John Marston", "Dutch van der Linde", "Micah Bell"],
      correctAnswer: "Arthur Morgan",
      difficulty: "easy",
      explanation: "Arthur Morgan is the beloved senior enforcer of the Van der Linde gang."
    }
  ],
  "The Witcher 3: Wild Hunt": [
    {
      question: "What is Geralt of Rivia's profession and moniker?",
      options: ["Witcher (White Wolf / Butcher of Blaviken)", "Sorcerer of Aretuza", "Knight of the Flaming Rose", "Monster Hunter of Nilfgaard"],
      correctAnswer: "Witcher (White Wolf / Butcher of Blaviken)",
      difficulty: "easy",
      explanation: "Geralt is a Witcher from the School of the Wolf."
    }
  ],
  "God of War Ragnarök": [
    {
      question: "What weapon did Brok and Sindri forge for Kratos to replace the Blades of Chaos in 2018?",
      options: ["Leviathan Axe", "Draupnir Spear", "Blade of Olympus", "Njord Shield"],
      correctAnswer: "Leviathan Axe",
      difficulty: "easy",
      explanation: "The frost-imbued Leviathan Axe belonged to Faye before she passed it to Kratos."
    }
  ],
  "Marvel's Spider-Man 2": [
    {
      question: "Which two Spider-Heroes share playable protagonist duties in Marvel's Spider-Man 2?",
      options: ["Peter Parker and Miles Morales", "Peter Parker and Ben Reilly", "Miles Morales and Miguel O'Hara", "Peter Parker and Gwen Stacy"],
      correctAnswer: "Peter Parker and Miles Morales",
      difficulty: "easy",
      explanation: "Players switch seamlessly between Peter Parker (Symbiote Suit) and Miles Morales (Bio-Electricity) across New York."
    },
    {
      question: "Who is the terrifying alien symbiote antagonist voiced by Tony Todd?",
      options: ["Venom", "Carnage", "Kraven the Hunter", "Green Goblin"],
      correctAnswer: "Venom",
      difficulty: "easy",
      explanation: "Venom bonds with Harry Osborn and seeks to 'heal the world' through symbiote infection."
    }
  ],
  "Rust": [
    {
      question: "What is the standard starting item given to all naked players upon waking on the beach in Rust?",
      options: ["A Rock and a Torch", "A Wooden Spear", "A Stone Hatchet", "A Bandage"],
      correctAnswer: "A Rock and a Torch",
      difficulty: "easy",
      explanation: "Every fresh spawn begins on the coast with nothing but a Rock and a Torch to gather wood and stone."
    },
    {
      question: "What resource must be placed in a Tool Cupboard (TC) to prevent your base from decaying over time?",
      options: ["Upkeep Materials (Wood, Stone, Metal, HQM)", "Scrap", "Low Grade Fuel", "Sulfur"],
      correctAnswer: "Upkeep Materials (Wood, Stone, Metal, HQM)",
      difficulty: "medium",
      explanation: "Tool Cupboards consume regular upkeep supplies corresponding to the building materials used."
    }
  ],
  "Rocket League": [
    {
      question: "What type of vehicles do players drive in the soccar arena in Rocket League?",
      options: ["Rocket-Powered Battle-Cars", "Formula 1 Racers", "Monster Trucks", "Hovercrafts"],
      correctAnswer: "Rocket-Powered Battle-Cars",
      difficulty: "easy",
      explanation: "Players pilot rocket-boosted acrobat cars (like the Octane, Dominus, and Fennec) to hit giant soccer balls."
    },
    {
      question: "What is the most popular and universally played car chassis in Rocket League esports?",
      options: ["Octane", "Breakout", "Batmobile", "Merc"],
      correctAnswer: "Octane",
      difficulty: "easy",
      explanation: "The Octane's rounded hitbox and tight turn radius make it the undisputed competitive favorite."
    }
  ],
  "Dead by Daylight": [
    {
      question: "How many generators must Survivors repair to power the exit gates in a standard trial?",
      options: ["5 Generators", "4 Generators", "6 Generators", "3 Generators"],
      correctAnswer: "5 Generators",
      difficulty: "easy",
      explanation: "Survivors must complete repairs on 5 out of the 7 trial generators to activate the exit gate switches."
    },
    {
      question: "What Eldritch spider-like deity creates the trials and consumes sacrificed Survivors?",
      options: ["The Entity", "Cthulhu", "The Observer", "The Fog Father"],
      correctAnswer: "The Entity",
      difficulty: "easy",
      explanation: "The Entity feeds on the hope and despair of Survivors sacrificed onto hooks."
    }
  ],
  "Hollow Knight": [
    {
      question: "What is the ancient ruined kingdom in which Hollow Knight takes place?",
      options: ["Hallownest", "Pharloom", "Deepnest", "Dirtmouth"],
      correctAnswer: "Hallownest",
      difficulty: "easy",
      explanation: "Hallownest is the sprawling underground bug kingdom succumbing to the orange Infection."
    }
  ],
  "Hades II": [
    {
      question: "Who is the Immortal Princess of the Underworld and protagonist of Hades II?",
      options: ["Melinoë", "Zagreus", "Nyx", "Hecate"],
      correctAnswer: "Melinoë",
      difficulty: "easy",
      explanation: "Melinoë, the sister of Zagreus and daughter of Hades, seeks to overthrow the Titan of Time, Chronos."
    },
    {
      question: "Who is the primary Titan antagonist in Hades II who has imprisoned the House of Hades?",
      options: ["Chronos (Titan of Time)", "Hyperion", "Typhon", "Atlas"],
      correctAnswer: "Chronos (Titan of Time)",
      difficulty: "easy",
      explanation: "Chronos escaped his chains to wage war on Olympus and take over the Underworld."
    }
  ],
  "Helldivers 2": [
    {
      question: "What is the patriotic slogan shouted by Helldivers while spreading galactic democracy?",
      options: ["For Super Earth! / How about a cup of Liber-tea?!", "For the Republic!", "To Infinity and Beyond!", "War Never Changes!"],
      correctAnswer: "For Super Earth! / How about a cup of Liber-tea?!",
      difficulty: "easy",
      explanation: "Helldivers spread Managed Democracy across the galaxy in the name of Super Earth."
    }
  ],
  "EA SPORTS FC 24": [
    {
      question: "What new gameplay feature in EA FC 24 gives elite footballers unique signature abilities and traits?",
      options: ["PlayStyles / PlayStyles+", "Skill Moves 2.0", "HyperMotion X", "Flair Boost"],
      correctAnswer: "PlayStyles / PlayStyles+",
      difficulty: "easy",
      explanation: "PlayStyles and PlayStyles+ (like Finesse Shot+, Whipped Pass, and Trivela) give superstars authentic signature moves."
    },
    {
      question: "What historic feature was added to Ultimate Team (FUT) for the first time in FC 24?",
      options: ["Mixed Men's and Women's football squads", "Indoor 5-a-side matches", "VR match spectator mode", "Create-a-Club stadium mode"],
      correctAnswer: "Mixed Men's and Women's football squads",
      difficulty: "easy",
      explanation: "FC 24 introduced female football stars alongside male legends into Ultimate Team on the same pitch."
    }
  ]
};

async function seedAll() {
  await connectDB();

  console.log("Starting Quiz Question database sync...");
  let inserted = 0;
  let updated = 0;

  const animeTitles = await AnimeTitle.find({}).lean();
  const gameTitles = await GameTitle.find({}).lean();

  const animeMap = new Map();
  animeTitles.forEach((a) => {
    animeMap.set(a.title.toLowerCase().trim(), a);
    if (a.aliases) a.aliases.forEach((alias) => animeMap.set(alias.toLowerCase().trim(), a));
  });

  const gameMap = new Map();
  gameTitles.forEach((g) => {
    gameMap.set(g.title.toLowerCase().trim(), g);
    if (g.aliases) g.aliases.forEach((alias) => gameMap.set(alias.toLowerCase().trim(), g));
  });

  for (const [titleKey, questionList] of Object.entries(QUIZ_DATA)) {
    const cleanKey = titleKey.toLowerCase().trim();
    let refDoc = animeMap.get(cleanKey);
    let type = "anime";
    let refModel = "AnimeTitle";

    if (!refDoc) {
      refDoc = gameMap.get(cleanKey);
      if (refDoc) {
        type = "game";
        refModel = "GameTitle";
      }
    }

    const titleRef = refDoc ? refDoc._id : null;
    const standardTitle = refDoc ? refDoc.title : titleKey;

    for (const q of questionList) {
      const existing = await QuizQuestion.findOne({ question: q.question });
      if (!existing) {
        await QuizQuestion.create({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          category: type === "anime" ? "Anime Lore" : "Gaming Culture",
          type: type,
          title: standardTitle,
          titleRef: titleRef,
          titleRefModel: refModel,
          difficulty: q.difficulty || "medium",
          source: "verified-canon",
          tags: [standardTitle, type],
        });
        inserted++;
      } else {
        existing.title = standardTitle;
        existing.type = type;
        if (titleRef) {
          existing.titleRef = titleRef;
          existing.titleRefModel = refModel;
        }
        await existing.save();
        updated++;
      }
    }
  }

  console.log(`\n✓ Sync Finished! Inserted: ${inserted} new questions, Updated: ${updated} existing.`);
  const totalInDb = await QuizQuestion.countDocuments({});
  const totalAnime = await QuizQuestion.countDocuments({ type: "anime" });
  const totalGames = await QuizQuestion.countDocuments({ type: "game" });
  console.log(`\n📊 NEW STATS: Total: ${totalInDb} | Anime: ${totalAnime} | Gaming: ${totalGames}`);

  await mongoose.disconnect();
}

seedAll();
