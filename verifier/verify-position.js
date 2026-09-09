const fs = require("fs");
const path = require("path");
const { verifyEvidenceBundle } = require("./verifier_core");

if (require.main === module) {
  const targetFile = process.argv[2];
  if (!targetFile) {
    console.log("Usage: node verifier/verify-position.js <path-to-evidence.json>");
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(targetFile), "utf-8");
  const data = JSON.parse(raw);
  const report = verifyEvidenceBundle(data);
  console.log("==================================================");
  console.log(`VERIFICATION RESULT: [${report.status}]`);
  console.log("==================================================");
  console.log(JSON.stringify(report, null, 2));
}

module.exports = {
  verifyEvidenceBundle,
};
