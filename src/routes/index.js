const express = require("express");
const bwipjs = require("bwip-js");

const { findTodayQueueByHN, checkConnection } = require("../db");
const fieldMap = require("../config/fieldMap");
const { getQueuePrefixInfo } = require("../config/queuePrefixInfo");

const router = express.Router();

function pick(row, key) {
  const col = fieldMap[key];
  if (!col) return null;
  const value = row[col];
  return value === undefined || value === null ? null : value;
}

function todayThaiDate() {
  const now = new Date();
  return now.toLocaleDateString("th-TH-u-ca-buddhist", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function buildTicket(row) {
  const queueNo = pick(row, "queueNo") || "-";
  const barcodeValue = pick(row, "barcodeValue") || queueNo;

  let barcodeDataUrl = null;
  try {
    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: String(barcodeValue),
      scale: 4,
      height: 13,
      includetext: false,
    });
    barcodeDataUrl = `data:image/png;base64,${png.toString("base64")}`;
  } catch (err) {
    barcodeDataUrl = null;
  }

  const { steps, note } = getQueuePrefixInfo(queueNo);

  return {
    queueNo,
    queueLabel: pick(row, "queueLabel"),
    barcodeValue,
    barcodeDataUrl,
    patientName: pick(row, "patientName"),
    hn: pick(row, "hn"),
    clinicCode: pick(row, "clinicCode"),
    clinicName: pick(row, "clinicName"),
    rightCode: pick(row, "rightCode"),
    rightName: pick(row, "rightName"),
    hospitalName: process.env.HOSPITAL_NAME || "โรงพยาบาล",
    steps,
    note,
  };
}

/** รวมแถวที่มี clinic ซ้ำกันให้เหลือตัวแทนคลินิกละ 1 แถว สำหรับหน้าเลือกคลินิก */
function distinctClinics(rows) {
  const seen = new Map();
  for (const row of rows) {
    const clinicCode = pick(row, "clinicCode");
    const key = clinicCode === null ? "" : String(clinicCode);
    if (!seen.has(key)) {
      seen.set(key, {
        clinicCode,
        clinicName: pick(row, "clinicName"),
        queueNo: pick(row, "queueNo"),
      });
    }
  }
  return [...seen.values()];
}

router.get("/", (req, res) => {
  res.render("search", { error: null, hn: "", todayThai: todayThaiDate() });
});

// เปิด /db-check ในเบราว์เซอร์เพื่อเช็กว่าต่อ SQL Server ได้จริงหรือไม่ แยกจากการค้นหา HN
router.get("/db-check", async (req, res) => {
  try {
    await checkConnection();
    res.type("text/plain").send("เชื่อมต่อฐานข้อมูลสำเร็จ (OK)");
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .type("text/plain")
      .send(`เชื่อมต่อฐานข้อมูลไม่สำเร็จ:\n${err.message}`);
  }
});

router.get("/print", async (req, res) => {
  const hn = (req.query.hn || "").trim();
  const clinicParam = (req.query.clinic || "").trim();
  if (!hn) {
    return res.render("search", {
      error: "กรุณากรอกเลข HN",
      hn: "",
      todayThai: todayThaiDate(),
    });
  }

  try {
    const rows = await findTodayQueueByHN(hn);
    if (!rows.length) {
      return res.render("search", {
        error: `ไม่พบคิวห้องจ่ายยา OPD ของ HN ${hn} สำหรับวันนี้`,
        hn,
        todayThai: todayThaiDate(),
      });
    }

    // พบแถวข้อมูลจริง แต่ถ้าอ่าน "เลขคิว" ไม่ได้เลยสักแถว แปลว่าชื่อคอลัมน์ใน fieldMap.js
    // ไม่ตรงกับตารางจริง - ไม่ควรพาไปหน้าปริ้นบัตรเปล่าๆ ให้แจ้งเตือนแทน
    const allQueueNosMissing = rows.every((row) => pick(row, "queueNo") === null);
    if (allQueueNosMissing) {
      const availableColumns = Object.keys(rows[0]).join(", ");
      return res.render("search", {
        error:
          `พบข้อมูล ${rows.length} แถวสำหรับ HN ${hn} วันนี้ แต่อ่านค่า "เลขคิว" ไม่ได้ ` +
          `(คอลัมน์ "${fieldMap.queueNo}" ที่ตั้งไว้ใน src/config/fieldMap.js ไม่มีในตาราง หรือชื่อไม่ตรง) ` +
          `คอลัมน์จริงที่พบในตาราง: ${availableColumns}`,
        hn,
        todayThai: todayThaiDate(),
      });
    }

    // ถ้า HN นี้มีคิวมากกว่า 1 คลินิกในวันเดียวกัน บาร์โค้ดของแต่ละคลินิกไม่เหมือนกัน
    // ให้เลือกคลินิกก่อนปริ้น (ยกเว้นกดเลือกมาแล้วจาก ?clinic=...)
    const clinics = distinctClinics(rows);
    if (!clinicParam && clinics.length > 1) {
      return res.render("choose-clinic", { hn, clinics, todayThai: todayThaiDate() });
    }

    const filteredRows = clinicParam
      ? rows.filter((row) => String(pick(row, "clinicCode") ?? "") === clinicParam)
      : rows;

    if (!filteredRows.length) {
      return res.render("search", {
        error: `ไม่พบคิวของคลินิกที่เลือกสำหรับ HN ${hn} สำหรับวันนี้ กรุณาค้นหาใหม่`,
        hn,
        todayThai: todayThaiDate(),
      });
    }

    const tickets = await Promise.all(filteredRows.map(buildTicket));
    res.render("ticket", { tickets, todayThai: todayThaiDate() });
  } catch (err) {
    console.error(err);
    res.status(500).render("search", {
      error: `เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาแจ้งเจ้าหน้าที่ IT (${err.message})`,
      hn,
      todayThai: todayThaiDate(),
    });
  }
});

module.exports = router;
