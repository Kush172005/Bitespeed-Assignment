const express = require("express");
const { connectDB } = require("./config/database");
const dotenv = require("dotenv");
const { contactRoutes } = require("./routes/contact");

const app = express();
const port = 4000;

dotenv.config();
connectDB();

app.get("/", (req, res) => {
    res.send("Welcome to the Prisma API!");
});

app.use("/identify", contactRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
