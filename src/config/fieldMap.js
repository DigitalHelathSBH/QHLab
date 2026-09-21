/**
 * แผนที่ชื่อคอลัมน์ในตาราง ssbdatabase.dbo.QuickWin_PharOPD -> ข้อมูลที่ใช้พิมพ์บนบัตรคิว
 *
 * อัปเดตตามคอลัมน์จริงที่ตรวจพบจากระบบ:
 *   id, queueServiceUnitId, queueTypeId, qDisplay, hn, vn, visitDate, isPrint,
 *   isComplete, makeDateTime, suffix, clinic, rightCode, phxQueue, phxBarcode
 *
 * clinic/rightCode ในตาราง QuickWin_PharOPD เก็บเป็น "รหัสล้วน" (เช่น clinic=2111, rightCode=2)
 * โค้ดใน src/db.js จึง LEFT JOIN กับตาราง master เพื่อแปลงเป็นชื่อเต็ม:
 *   - [SSBDatabase].[dbo].[ClinicName]   (CODE -> ClinicName)   ผลลัพธ์อยู่ในคอลัมน์ clinicDisplayName
 *   - [SSBDatabase].[dbo].[RightCodeView] (RightCode -> RightName) ผลลัพธ์อยู่ในคอลัมน์ rightDisplayName
 *
 * *** จุดที่ยังเป็นการเดา ต้องช่วยตรวจสอบกับข้อมูลจริงอีกครั้ง ***
 * - queueLabel ("ยา 1-2 รายการ" ในตัวอย่าง): ไม่พบคอลัมน์ข้อความสำเร็จรูปในตารางนี้ คาดว่า
 *   queueTypeId เป็นรหัสที่ต้อง join ตาราง lookup ชื่อประเภทคิวแยกต่างหาก - ตอนนี้ตั้งเป็น null
 *   (ช่องนี้จะไม่แสดงบนบัตร) ถ้ามีตาราง lookup แจ้งชื่อตารางมาเพื่อเพิ่ม join ได้
 *
 * หมายเหตุ: เดิมมีช่อง "จำนวนคิวที่รอ" ที่คำนวณสดจาก isComplete/makeDateTime แต่ถูกลบออกแล้ว
 * เพราะไม่มีคอลัมน์จริงรองรับและตรรกะที่ใช้ไม่ได้รับการยืนยันว่าตรงกับระบบจริงของ รพ.
 */
module.exports = {
  hn: "hn",
  visitDate: "visitDate",

  // หมายเลขคิวที่แสดงผล เช่น "S006"
  queueNo: "qDisplay",

  // หมวดคิว/ป้ายกำกับใต้กรอบเลขคิว - ไม่พบคอลัมน์ข้อความสำเร็จรูป (ดูหมายเหตุด้านบน)
  queueLabel: null,

  // เลขที่ใช้พิมพ์เป็นบาร์โค้ด (ใต้แท่งบาร์โค้ด)
  barcodeValue: "phxBarcode",

  // ชื่อ-นามสกุลผู้ป่วยพร้อมคำนำหน้า จาก dbo.GetFullNameWithTitle(HN) (ดู src/db.js)
  patientName: "patientFullName",

  // คลินิก - รหัสดิบจากตาราง + ชื่อเต็มจากการ join ตาราง ClinicName (ดูหมายเหตุด้านบน)
  clinicCode: "clinic",
  clinicName: "clinicDisplayName",

  // สิทธิการรักษา - รหัสดิบจากตาราง + ชื่อเต็มจากการ join ตาราง RightCodeView (ดูหมายเหตุด้านบน)
  rightCode: "rightCode",
  rightName: "rightDisplayName",
};
