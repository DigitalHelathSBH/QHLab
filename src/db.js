const sql = require("mssql");

const useWindowsAuth = String(process.env.DB_USE_WINDOWS_AUTH).toLowerCase() === "true";

const config = {
  server: process.env.DB_SERVER || "localhost",
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE || "ssbdatabase",
  options: {
    trustServerCertificate:
      String(process.env.DB_TRUST_SERVER_CERTIFICATE).toLowerCase() !== "false",
    enableArithAbort: true,
  },
};

if (useWindowsAuth) {
  config.authentication = { type: "ntlm", options: {} };
} else {
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
}

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .catch((err) => {
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

/**
 * ค้นหาคิวห้องจ่ายยา OPD ของ HN สำหรับ "วันนี้" เท่านั้น (ล็อกวันที่ปัจจุบันเสมอ)
 */
async function findTodayQueueByHN(hn) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("hn", sql.VarChar(20), hn.trim())
    .query(
      // cast ทั้งสองฝั่งเป็น date เพราะ VISITDATE อาจเป็น datetime ที่มีเวลาติดมาด้วย
      // (ถ้า cast แค่ getdate() ฝั่งเดียว แถวที่ VISITDATE มีเวลาไม่ใช่เที่ยงคืนจะไม่ match แล้วดูเหมือน "หาไม่เจอ")
      // LEFT JOIN ตาราง master เพื่อแปลงรหัสคลินิก/สิทธิ เป็นชื่อเต็มสำหรับพิมพ์บนบัตร
      // dbo.GetFullNameWithTitle(HN) คืนชื่อ-นามสกุลผู้ป่วยพร้อมคำนำหน้า
      `select q.*, c.ClinicName as clinicDisplayName, r.RightName as rightDisplayName,
              dbo.GetFullNameWithTitle(q.HN) as patientFullName
       from ssbdatabase.dbo.QuickWin_PharOPD q
       left join [SSBDatabase].[dbo].[ClinicName] c on c.CODE = q.clinic
       left join [SSBDatabase].[dbo].[RightCodeView] r on r.RightCode = q.rightCode
       where LTRIM(RTRIM(q.HN)) = @hn
         and cast(q.VISITDATE as date) = cast(getdate() as date)`
    );
  return result.recordset;
}

/** ใช้เช็คว่าต่อฐานข้อมูลได้จริงหรือไม่ แยกจากการค้นหา HN */
async function checkConnection() {
  const pool = await getPool();
  await pool.request().query("select 1 as ok");
  return true;
}

module.exports = { getPool, findTodayQueueByHN, checkConnection };
