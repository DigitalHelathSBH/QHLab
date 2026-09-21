require("dotenv").config();
const path = require("path");
const express = require("express");

const routes = require("./routes");

const app = express();

// ตั้งค่าถ้าต้องรันหลัง nginx reverse proxy แบบ path-based เช่น /qhlab
// (ดู README สำหรับตัวอย่าง nginx config) ถ้าเข้าถึงตรงๆ ที่ root ปล่อยว่างไว้ได้เลย
const basePath = (process.env.BASE_PATH || "").replace(/\/$/, "");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.locals.basePath = basePath;

app.use(basePath, express.static(path.join(__dirname, "public")));
app.use(basePath, routes);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`หน้าปริ้นบัตรคิว รันอยู่ที่ http://localhost:${port}`);
});
