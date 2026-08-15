import User from "./user.schema.js";
import Report from "./report.schema.js";
import Swipe from "./swipe.schema.js";
import Message from "./message.schema.js";
import Plan from "./plan.schema.js";
import Payment from "./payment.schema.js";
import EmailTemplate from "./emailTemplate.schema.js";
import AnimeCategory from "./animeCategory.schema.js";
import AnimeTitle from "./animeTitle.schema.js";
import GameCategory from "./gameCategory.schema.js";
import GameTitle from "./gameTitle.schema.js";
import Country from "./country.schema.js";
import State from "./state.schema.js";
import City from "./city.schema.js";

const modelsMap = {
  User,
  Report,
  Swipe,
  Message,
  Plan,
  Payment,
  EmailTemplate,
  AnimeCategory,
  AnimeTitle,
  GameCategory,
  GameTitle,
  Country,
  State,
  City,
};

export {
  User,
  Report,
  Swipe,
  Message,
  Plan,
  Payment,
  EmailTemplate,
  AnimeCategory,
  AnimeTitle,
  GameCategory,
  GameTitle,
  Country,
  State,
  City,
  modelsMap,
};

export default modelsMap;
