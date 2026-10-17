import { hashPassword } from "../lib/auth";
const pw = process.argv[2]; if (!pw || pw.length < 12) { console.error("Usage: npm run hash-password -- '<password of 12+ characters>'"); process.exit(1); }
console.log(hashPassword(pw));
