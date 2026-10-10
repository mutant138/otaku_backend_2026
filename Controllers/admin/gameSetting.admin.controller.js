import {
  getOrSeedAllGameSettings,
  updateGameSettingById,
} from "../../services/gameSetting.service.js";

/**
 * GET /api/admin/games
 * Get all arena game settings
 */
export async function getAdminGameSettings(req, res) {
  try {
    const settings = await getOrSeedAllGameSettings();
    return res.status(200).json({
      status: true,
      message: "Arena game settings retrieved successfully",
      data: settings,
    });
  } catch (error) {
    console.error("[getAdminGameSettings Error]:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve game settings",
      error: error.message,
    });
  }
}

/**
 * PUT /api/admin/games/:gameId
 * Update a specific arena game's public visibility or reward/penalty
 */
export async function updateAdminGameSetting(req, res) {
  try {
    const { gameId } = req.params;
    const { isPublic, winReward, defeatPenalty, drawReward, title, description } = req.body;

    const payload = {};
    if (typeof isPublic === "boolean") payload.isPublic = isPublic;
    if (winReward !== undefined) payload.winReward = Math.max(0, Number(winReward));
    if (defeatPenalty !== undefined) payload.defeatPenalty = Math.max(0, Number(defeatPenalty));
    if (drawReward !== undefined) payload.drawReward = Math.max(0, Number(drawReward));
    if (title) payload.title = title;
    if (description) payload.description = description;

    const updated = await updateGameSettingById(gameId, payload);
    if (!updated) {
      return res.status(404).json({
        status: false,
        message: `Game with ID '${gameId}' not found`,
      });
    }

    return res.status(200).json({
      status: true,
      message: `Settings for '${updated.title}' updated successfully`,
      data: updated,
    });
  } catch (error) {
    console.error("[updateAdminGameSetting Error]:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to update game setting",
      error: error.message,
    });
  }
}

