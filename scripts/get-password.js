const fs = require('fs');
const path = require('path');

// Manually read .env.local to avoid dependency issues if not installed
let secret = "DO_PANAMA_DEFAULT_SECRET";
try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/CRM_SECRET_KEY=(.*)/);
        if (match && match[1]) {
            secret = match[1].trim();
        }
    }
} catch (e) {
    console.error("Warning: Could not read .env.local");
}

function getCurrentPassword() {
  const PERIOD_MS = 15 * 24 * 60 * 60 * 1000; 
  const currentPeriod = Math.floor(Date.now() / PERIOD_MS);
  const hash = simpleHash(`${secret}-${currentPeriod}`);
  const shortCode = Math.abs(hash).toString().slice(0, 4); 
  return `CRM-${shortCode}`;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; 
  }
  return hash;
}

console.log("-----------------------------------------");
console.log("🔐 CRM SECURITY TOOL");
console.log("-----------------------------------------");
console.log("Time-Based Password (15-day rotation):");
console.log(`\x1b[32m${getCurrentPassword()}\x1b[0m`);
console.log("-----------------------------------------");
