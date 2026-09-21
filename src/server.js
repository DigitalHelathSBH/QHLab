require("dotenv").config();
const path = require("path");
const express = require("express");

const routes = require("./routes");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", routes);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`หน้าปริ้นบัตรคิว รันอยู่ที่ http://localhost:${port}`);
});
