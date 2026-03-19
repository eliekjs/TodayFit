/**
 * One-off: inspect Functional Fitness Exercise Database xlsx structure.
 * Run: node scripts/inspect-ff-db.js
 */
const XLSX = require("xlsx");
const path = require("path");

const filePath = path.join(process.env.HOME || "/Users/ellie", "Downloads", "Functional+Fitness+Exercise+Database+(version+2.9).xlsx");
const workbook = XLSX.readFile(filePath);

console.log("Sheet names:", workbook.SheetNames);
console.log("");

const sheet = workbook.Sheets["Exercises"];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
console.log("Total rows:", rows.length);
// Show rows 0-8 so we can find header row
for (let i = 0; i < Math.min(10, rows.length); i++) {
  console.log("Row", i, ":", JSON.stringify(rows[i].slice(0, 15)));
}
// Column letters B=1, C=2,... AF=32. Get first cell of each column for row 3,4,5
// Find row that looks like headers (first cell might be "Exercise" or "Exercise Name" or similar)
let headerRowIndex = -1;
for (let i = 0; i < Math.min(50, rows.length); i++) {
  const first = (rows[i][0] || "").toString().toLowerCase();
  if (first.includes("exercise") && (first.includes("name") || first === "exercise" || first === "exercises")) {
    headerRowIndex = i;
    break;
  }
}
if (headerRowIndex < 0) {
  // try "category" or "movement"
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const first = (rows[i][0] || "").toString().toLowerCase();
    if (first === "category" || first === "movement category") {
      headerRowIndex = i;
      break;
    }
  }
}
console.log("Header row index (guess):", headerRowIndex);
if (headerRowIndex >= 0) {
  console.log("Header row:", rows[headerRowIndex]);
  console.log("Next row (first data):", rows[headerRowIndex + 1]);
}
// Also dump row 10-20 first cells
for (let i = 10; i < 25; i++) {
  console.log("Row", i, "first 5:", (rows[i] || []).slice(0, 5));
}
