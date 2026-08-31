import dbCommonQuery from "../../utils/dbCommonQuery.js";

// Helper to generate a slug from string
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");

// ── ANIME CATEGORIES ──

export const getAnimeCategories = async (req, res) => {
  try {
    const categories = await dbCommonQuery({
      model: "AnimeCategory",
      action: "find",
      filter: {},
      sort: { name: 1 },
      lean: true,
    });
    return res.status(200).json({ status: true, data: categories });
  } catch (error) {
    console.error("Get Anime Categories Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch anime categories." });
  }
};

export const createAnimeCategory = async (req, res) => {
  try {
    const { name, slug, description, icon } = req.body;
    if (!name) {
      return res.status(400).json({ status: false, message: "Category name is required." });
    }

    const finalSlug = slug?.trim() || slugify(name);
    const category = await dbCommonQuery({
      model: "AnimeCategory",
      action: "create",
      data: {
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || "",
        icon: icon?.trim() || "🔥",
      },
    });

    return res.status(201).json({ status: true, message: "Anime category created.", data: category });
  } catch (error) {
    console.error("Create Anime Category Error:", error);
    return res.status(500).json({ status: false, message: "Failed to create anime category." });
  }
};

export const updateAnimeCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon } = req.body;

    const updateData = {};
    if (name) {
      updateData.name = name.trim();
      if (!slug) updateData.slug = slugify(name);
    }
    if (slug) updateData.slug = slug.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (icon !== undefined) updateData.icon = icon.trim();

    const updated = await dbCommonQuery({
      model: "AnimeCategory",
      action: "findByIdAndUpdate",
      filter: id,
      data: updateData,
      lean: true,
    });

    if (!updated) {
      return res.status(404).json({ status: false, message: "Anime category not found." });
    }

    return res.status(200).json({ status: true, message: "Anime category updated.", data: updated });
  } catch (error) {
    console.error("Update Anime Category Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update anime category." });
  }
};

export const deleteAnimeCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbCommonQuery({
      model: "AnimeCategory",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "Anime category not found." });
    }

    // Pull category ID from any associated titles
    await dbCommonQuery({
      model: "AnimeTitle",
      action: "updateMany",
      filter: { categories: id },
      data: { $pull: { categories: id } },
    });

    return res.status(200).json({ status: true, message: "Anime category deleted." });
  } catch (error) {
    console.error("Delete Anime Category Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete anime category." });
  }
};

// ── GAME CATEGORIES ──

export const getGameCategories = async (req, res) => {
  try {
    const categories = await dbCommonQuery({
      model: "GameCategory",
      action: "find",
      filter: {},
      sort: { name: 1 },
      lean: true,
    });
    return res.status(200).json({ status: true, data: categories });
  } catch (error) {
    console.error("Get Game Categories Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch game categories." });
  }
};

export const createGameCategory = async (req, res) => {
  try {
    const { name, slug, description, icon } = req.body;
    if (!name) {
      return res.status(400).json({ status: false, message: "Category name is required." });
    }

    const finalSlug = slug?.trim() || slugify(name);
    const category = await dbCommonQuery({
      model: "GameCategory",
      action: "create",
      data: {
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || "",
        icon: icon?.trim() || "⚔️",
      },
    });

    return res.status(201).json({ status: true, message: "Game category created.", data: category });
  } catch (error) {
    console.error("Create Game Category Error:", error);
    return res.status(500).json({ status: false, message: "Failed to create game category." });
  }
};

export const updateGameCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon } = req.body;

    const updateData = {};
    if (name) {
      updateData.name = name.trim();
      if (!slug) updateData.slug = slugify(name);
    }
    if (slug) updateData.slug = slug.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (icon !== undefined) updateData.icon = icon.trim();

    const updated = await dbCommonQuery({
      model: "GameCategory",
      action: "findByIdAndUpdate",
      filter: id,
      data: updateData,
      lean: true,
    });

    if (!updated) {
      return res.status(404).json({ status: false, message: "Game category not found." });
    }

    return res.status(200).json({ status: true, message: "Game category updated.", data: updated });
  } catch (error) {
    console.error("Update Game Category Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update game category." });
  }
};

export const deleteGameCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbCommonQuery({
      model: "GameCategory",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "Game category not found." });
    }

    // Pull category ID from any associated game titles
    await dbCommonQuery({
      model: "GameTitle",
      action: "updateMany",
      filter: { categories: id },
      data: { $pull: { categories: id } },
    });

    return res.status(200).json({ status: true, message: "Game category deleted." });
  } catch (error) {
    console.error("Delete Game Category Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete game category." });
  }
};
