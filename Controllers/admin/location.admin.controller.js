import dbCommonQuery from "../../utils/dbCommonQuery.js";

/**
 * Get complete Location Hierarchy (Countries with States & Cities)
 * GET /api/admin/locations/hierarchy
 */
export const getLocationsHierarchy = async (req, res) => {
  try {
    const countries = await dbCommonQuery({
      model: "Country",
      action: "find",
      filter: {},
      sort: { name: 1 },
      lean: true,
    });

    const states = await dbCommonQuery({
      model: "State",
      action: "find",
      filter: {},
      sort: { name: 1 },
      lean: true,
    });

    const cities = await dbCommonQuery({
      model: "City",
      action: "find",
      filter: {},
      sort: { name: 1 },
      lean: true,
    });

    return res.status(200).json({
      status: true,
      data: {
        countries,
        states,
        cities,
      },
    });
  } catch (error) {
    console.error("Get Location Hierarchy Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch locations hierarchy." });
  }
};

// ── COUNTRIES ──

export const getCountries = async (req, res) => {
  try {
    const countries = await dbCommonQuery({
      model: "Country",
      action: "find",
      filter: {},
      sort: { name: 1 },
      lean: true,
    });
    return res.status(200).json({ status: true, data: countries });
  } catch (error) {
    console.error("Get Countries Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch countries." });
  }
};

export const createCountry = async (req, res) => {
  try {
    const { name, flag, code } = req.body;
    if (!name || !flag || !code) {
      return res.status(400).json({ status: false, message: "Name, flag emoji, and code are required." });
    }

    const country = await dbCommonQuery({
      model: "Country",
      action: "create",
      data: {
        name: name.trim(),
        flag: flag.trim(),
        code: code.trim().toUpperCase(),
      },
    });

    return res.status(201).json({ status: true, message: "Country created.", data: country });
  } catch (error) {
    console.error("Create Country Error:", error);
    return res.status(500).json({ status: false, message: "Failed to create country." });
  }
};

export const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, flag, code } = req.body;

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (flag) updateData.flag = flag.trim();
    if (code) updateData.code = code.trim().toUpperCase();

    const updated = await dbCommonQuery({
      model: "Country",
      action: "findByIdAndUpdate",
      filter: id,
      data: updateData,
      lean: true,
    });

    if (!updated) {
      return res.status(404).json({ status: false, message: "Country not found." });
    }

    return res.status(200).json({ status: true, message: "Country updated.", data: updated });
  } catch (error) {
    console.error("Update Country Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update country." });
  }
};

export const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;

    // Find all states belonging to this country
    const states = await dbCommonQuery({
      model: "State",
      action: "find",
      filter: { country: id },
      lean: true,
    });

    const stateIds = states.map((s) => s._id);

    // Delete cities in those states
    if (stateIds.length > 0) {
      await dbCommonQuery({
        model: "City",
        action: "deleteMany",
        filter: { state: { $in: stateIds } },
      });
    }

    // Delete states
    await dbCommonQuery({
      model: "State",
      action: "deleteMany",
      filter: { country: id },
    });

    // Delete country
    const deleted = await dbCommonQuery({
      model: "Country",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "Country not found." });
    }

    return res.status(200).json({ status: true, message: "Country and associated states/cities deleted." });
  } catch (error) {
    console.error("Delete Country Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete country." });
  }
};

// ── STATES ──

export const getStates = async (req, res) => {
  try {
    const { countryId } = req.query;
    const filter = countryId ? { country: countryId } : {};

    const states = await dbCommonQuery({
      model: "State",
      action: "find",
      filter,
      populate: { path: "country", select: "name flag code" },
      sort: { name: 1 },
      lean: true,
    });
    return res.status(200).json({ status: true, data: states });
  } catch (error) {
    console.error("Get States Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch states." });
  }
};

export const createState = async (req, res) => {
  try {
    const { name, country } = req.body;
    if (!name || !country) {
      return res.status(400).json({ status: false, message: "State name and Country ID are required." });
    }

    const state = await dbCommonQuery({
      model: "State",
      action: "create",
      data: {
        name: name.trim(),
        country,
      },
    });

    const populated = await dbCommonQuery({
      model: "State",
      action: "findById",
      filter: state._id,
      populate: { path: "country", select: "name flag code" },
      lean: true,
    });

    return res.status(201).json({ status: true, message: "State created.", data: populated });
  } catch (error) {
    console.error("Create State Error:", error);
    return res.status(500).json({ status: false, message: "Failed to create state." });
  }
};

export const updateState = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country } = req.body;

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (country) updateData.country = country;

    const updated = await dbCommonQuery({
      model: "State",
      action: "findByIdAndUpdate",
      filter: id,
      data: updateData,
      populate: { path: "country", select: "name flag code" },
      lean: true,
    });

    if (!updated) {
      return res.status(404).json({ status: false, message: "State not found." });
    }

    return res.status(200).json({ status: true, message: "State updated.", data: updated });
  } catch (error) {
    console.error("Update State Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update state." });
  }
};

export const deleteState = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete cities in this state
    await dbCommonQuery({
      model: "City",
      action: "deleteMany",
      filter: { state: id },
    });

    const deleted = await dbCommonQuery({
      model: "State",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "State not found." });
    }

    return res.status(200).json({ status: true, message: "State and associated cities deleted." });
  } catch (error) {
    console.error("Delete State Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete state." });
  }
};

// ── CITIES ──

export const getCities = async (req, res) => {
  try {
    const { stateId } = req.query;
    const filter = stateId ? { state: stateId } : {};

    const cities = await dbCommonQuery({
      model: "City",
      action: "find",
      filter,
      populate: {
        path: "state",
        select: "name country",
        populate: { path: "country", select: "name flag code" },
      },
      sort: { name: 1 },
      lean: true,
    });
    return res.status(200).json({ status: true, data: cities });
  } catch (error) {
    console.error("Get Cities Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch cities." });
  }
};

export const createCity = async (req, res) => {
  try {
    const { name, state } = req.body;
    if (!name || !state) {
      return res.status(400).json({ status: false, message: "City name and State ID are required." });
    }

    const city = await dbCommonQuery({
      model: "City",
      action: "create",
      data: {
        name: name.trim(),
        state,
      },
    });

    const populated = await dbCommonQuery({
      model: "City",
      action: "findById",
      filter: city._id,
      populate: {
        path: "state",
        select: "name country",
        populate: { path: "country", select: "name flag code" },
      },
      lean: true,
    });

    return res.status(201).json({ status: true, message: "City created.", data: populated });
  } catch (error) {
    console.error("Create City Error:", error);
    return res.status(500).json({ status: false, message: "Failed to create city." });
  }
};

export const updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, state } = req.body;

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (state) updateData.state = state;

    const updated = await dbCommonQuery({
      model: "City",
      action: "findByIdAndUpdate",
      filter: id,
      data: updateData,
      populate: {
        path: "state",
        select: "name country",
        populate: { path: "country", select: "name flag code" },
      },
      lean: true,
    });

    if (!updated) {
      return res.status(404).json({ status: false, message: "City not found." });
    }

    return res.status(200).json({ status: true, message: "City updated.", data: updated });
  } catch (error) {
    console.error("Update City Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update city." });
  }
};

export const deleteCity = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbCommonQuery({
      model: "City",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "City not found." });
    }

    return res.status(200).json({ status: true, message: "City deleted successfully." });
  } catch (error) {
    console.error("Delete City Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete city." });
  }
};
