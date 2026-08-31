import express from "express";
import {
  getLocationsHierarchy,
  getCountries,
  createCountry,
  updateCountry,
  deleteCountry,
  getStates,
  createState,
  updateState,
  deleteState,
  getCities,
  createCity,
  updateCity,
  deleteCity,
} from "../../Controllers/admin/location.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.use(protectAdmin);

// Hierarchy
router.get("/hierarchy", getLocationsHierarchy);

// Countries
router.get("/countries", getCountries);
router.post("/countries", createCountry);
router.put("/countries/:id", updateCountry);
router.delete("/countries/:id", deleteCountry);

// States
router.get("/states", getStates);
router.post("/states", createState);
router.put("/states/:id", updateState);
router.delete("/states/:id", deleteState);

// Cities
router.get("/cities", getCities);
router.post("/cities", createCity);
router.put("/cities/:id", updateCity);
router.delete("/cities/:id", deleteCity);

export default router;
