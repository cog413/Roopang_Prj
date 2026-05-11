// Imports typing_contents to D1 remote via Cloudflare REST API (bypasses CLI shell encoding limits).
// Usage: node manually_command/run_typing_import.js
// Requires: wrangler OAuth token in default.toml

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SQL_PATH = path.join(__dirname, 'import_typing_contents_260511.sql');
const BATCH_SIZE = 100;
const ACCOUNT_ID = '6c58daf51e3d34cdfd6cb85bd1f158ae';
const DATABASE_ID = '5c560a75-93a5-4414-88fc-0bd8e9ff4e26';

// Read OAuth token from wrangler config
const configPath = path.join(os.homedir(), 'AppData', 'Roaming', 'xdg.config', '.wrangler', 'config', 'default.toml');
const configText = fs.readFileSync(configPath, 'utf8');
const tokenMatch = configText.match(/oauth_token\s*=\s*"([^"]+)"/);
if (!tokenMatch) { console.error('No oauth_token found in wrangler config'); process.exit(1); }
const TOKEN = tokenMatch[1];

function cfApi(sql) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ sql, params: [] });
        const options = {
            hostname: 'api.cloudflare.com',
            path: `/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/raw`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const parsed = JSON.parse(data);
                if (!parsed.success) reject(new Error(JSON.stringify(parsed.errors)));
                else resolve(parsed);
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    const lines = fs.readFileSync(SQL_PATH, 'utf8').split('\n').filter(l => l.trim());
    const deleteLine = lines[0];
    const inserts = lines.slice(1);
    console.log(`Total inserts: ${inserts.length}`);

    console.log('Step 1: DELETE FROM typing_contents');
    await cfApi(deleteLine);

    const totalBatches = Math.ceil(inserts.length / BATCH_SIZE);
    for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
        const end = Math.min(i + BATCH_SIZE, inserts.length);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = inserts.slice(i, end).join('\n');
        process.stdout.write(`Batch ${batchNum}/${totalBatches} (rows ${i + 1}-${end})... `);
        await cfApi(batch);
        console.log('ok');
    }
    console.log(`Done. ${inserts.length} rows imported.`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
