import GameSetting, { DEFAULT_GAME_SETTINGS } from "../Models/gameSetting.schema.js";

/**
 * Ensures all default game configurations exist in MongoDB and returns them
 */
export async function getOrSeedAllGameSettings() {
  for (const def of DEFAULT_GAME_SETTINGS) {
    const existing = await GameSetting.findOne({ gameId: def.gameId });
    if (!existing) {
      await GameSetting.create(def);
    }
  }
  return await GameSetting.find({}).sort({ createdAt: 1 });
}

/**
 * Get setting for a specific game (seeds if not found)
 * @param {string} gameId - "trivia_duel" | "word_cipher"
 */
export async function getGameSetting(gameId) {
  try {
    let setting = await GameSetting.findOne({ gameId });
    if (!setting) {
      const defaultDef = DEFAULT_GAME_SETTINGS.find((g) => g.gameId === gameId);
      if (defaultDef) {
        setting = await GameSetting.create(defaultDef);
      }
    }
    return setting;
  } catch (err) {
    console.error(`[gameSetting.service] Error loading setting for ${gameId}:`, err);
    // Return hardcoded fallback if DB error
    return DEFAULT_GAME_SETTINGS.find((g) => g.gameId === gameId) || null;
  }
}

/**
 * Update a game's setting
 */
export async function updateGameSettingById(gameId, updateData) {
  // Ensure document exists
  await getGameSetting(gameId);

  const allowedUpdates = {};
  if (typeof updateData.isPublic === "boolean") {
    allowedUpdates.isPublic = updateData.isPublic;
  }
  if (typeof updateData.winReward === "number" && updateData.winReward >= 0) {
    allowedUpdates.winReward = updateData.winReward;
  }
  if (typeof updateData.defeatPenalty === "number" && updateData.defeatPenalty >= 0) {
    allowedUpdates.defeatPenalty = updateData.defeatPenalty;
  }
  if (typeof updateData.drawReward === "number" && updateData.drawReward >= 0) {
    allowedUpdates.drawReward = updateData.drawReward;
  }
  if (updateData.title && typeof updateData.title === "string") {
    allowedUpdates.title = updateData.title.trim();
  }
  if (updateData.description && typeof updateData.description === "string") {
    allowedUpdates.description = updateData.description.trim();
  }

  const updated = await GameSetting.findOneAndUpdate(
    { gameId },
    { $set: allowedUpdates },
    { new: true, runValidators: true }
  );

  return updated;
}

