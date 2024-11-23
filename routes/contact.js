const express = require("express");
const { contactChecker } = require("../controllers/contact");

const contactRoutes = express.Router();

contactRoutes.post("/", contactChecker);

module.exports = { contactRoutes };
