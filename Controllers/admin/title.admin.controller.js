import dbCommonQuery from "../../utils/dbCommonQuery.js";

// ── ANIME TITLES ──

export const getAnimeTitles = async (req, res) => {
  try {
    const { q, category } = req.query;
    const filter = {};

    if (q && q.trim()) {
      filter.title = new RegExp(q.trim(), "i");
    }
    if (category) {
      filter.categories = category;
    }

    const titles = await dbCommonQuery({
      model: "AnimeTitle",
      action: "find",
      filter,
      populate: { path: "categories", select: "name slug icon" },
      sort: { popularity: -1, createdAt: -1 },
      lean: true,
    });

    return res.status(200).json({ status: true, data: titles });
  } catch (error) {
    console.error("Get Anime Titles Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch anime titles." });
  }
};

export const createAnimeTitle = async (req, res) => {
  try {
    const { title, image, categories = [], popularity = 100 } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ status: false, message: "Anime title name is required." });
    }

    const newTitle = await dbCommonQuery({
      model: "AnimeTitle",
      action: "create",
      data: {
        title: title.trim(),
        image: image?.trim() || "",
        categories,
        popularity: Number(popularity) || 0,
      },
    });

    const populated = await dbCommonQuery({
      model: "AnimeTitle",
      action: "findById",
      filter: newTitle._id,
      populate: { path: "categories", select: "name slug icon" },
      lean: true,
    });

    return res.status(201).json({ status: true, message: "Anime title created.", data: populated });
  } catch (error) {
    console.error("Create Anime Title Error:", error);
    return res.status(500).json({ status: false, message: "Failed to create anime title." });
  }
};

export const updateAnimeTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, image, categories, popularity } = req.body;

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (image !== undefined) updateData.image = image.trim();
    if (categories !== undefined) updateData.categories = categories;
    if (popularity !== undefined) updateData.popularity = Number(popularity);

    const updated = await dbCommonQuery({
      model: "AnimeTitle",
      action: "findByIdAndUpdate",
      filter: id,
      data: updateData,
      populate: { path: "categories", select: "name slug icon" },
      lean: true,
    });

    if (!updated) {
      return res.status(404).json({ status: false, message: "Anime title not found." });
    }

    return res.status(200).json({ status: true, message: "Anime title updated.", data: updated });
  } catch (error) {
    console.error("Update Anime Title Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update anime title." });
  }
};

export const deleteAnimeTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbCommonQuery({
      model: "AnimeTitle",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "Anime title not found." });
    }

    return res.status(200).json({ status: true, message: "Anime title deleted successfully." });
  } catch (error) {
    console.error("Delete Anime Title Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete anime title." });
  }
};

// ── GAME TITLES ──

export const getGameTitles = async (req, res) => {
  try {
    const { q, category } = req.query;
    const filter = {};

    if (q && q.trim()) {
      filter.title = new RegExp(q.trim(), "i");
    }
    if (category) {
      filter.categories = category;
    }

    const titles = await dbCommonQuery({
      model: "GameTitle",
      action: "find",
      filter,
      populate: { path: "categories", select: "name slug icon" },
      sort: { popularity: -1, createdAt: -1 },
      lean: true,
    });

    return res.status(200).json({ status: true, data: titles });
  } catch (error) {
    console.error("Get Game Titles Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch game titles." });
  }
};

export const createGameTitle = async (req, res) => {
  try {
    const { title, image, categories = [], popularity = 100 } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ status: false, message: "Game title name is required." });
    }

    const newTitle = await dbCommonQuery({
      model: "GameTitle",
      action: "create",
      data: {
        title: title.trim(),
        image: image?.trim() || "",
        categories,
        popularity: Number(popularity) || 0,
      },
    });

    const populated = await dbCommonQuery({
      model: "GameTitle",
      action: "findById",
      filter: newTitle._id,
      populate: { path: "categories", select: "name slug icon" },
      lean: true,
    });

    return res.status(201).json({ status: true, message: "Game title created.", data: populated });
  } catch (error) {
    console.error("Create Game Title Error:", error);
    return res.status(500).json({ status: false, message: "Failed to create game title." });
  }
};

export const updateGameTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, image, categories, popularity } = req.body;

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (image !== undefined) updateData.image = image.trim();
    if (categories !== undefined) updateData.categories = categories;
    if (popularity !== undefined) updateData.popularity = Number(popularity);

    const updated = await dbCommonQuery({
      model: "GameTitle",
      action: "findByIdAndUpdate",
      filter: id,
      data: updateData,
      populate: { path: "categories", select: "name slug icon" },
      lean: true,
    });

    if (!updated) {
      return res.status(404).json({ status: false, message: "Game title not found." });
    }

    return res.status(200).json({ status: true, message: "Game title updated.", data: updated });
  } catch (error) {
    console.error("Update Game Title Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update game title." });
  }
};

export const deleteGameTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbCommonQuery({
      model: "GameTitle",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "Game title not found." });
    }

    return res.status(200).json({ status: true, message: "Game title deleted successfully." });
  } catch (error) {
    console.error("Delete Game Title Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete game title." });
  }
};
