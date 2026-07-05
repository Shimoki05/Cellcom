const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const inFile = path.join(__dirname, '..', 'localstorage-export.json');
if (!fs.existsSync(inFile)) {
  console.error('Create a localstorage-export.json file in project root (see DEPLOY.md for export snippet).');
  process.exit(1);
}

const raw = fs.readFileSync(inFile, 'utf8');
let dump = {};
try {
  dump = JSON.parse(raw);
} catch (err) {
  console.error('Failed to parse localstorage-export.json', err);
  process.exit(1);
}

const upsertKV = async (key, value) => {
  try {
    const payload = { key: String(key), value };
    const { error } = await supabase.from('kv').upsert(payload, { returning: 'minimal' });
    if (error) throw error;
    console.log('Upserted KV', key);
  } catch (err) {
    console.warn('KV upsert failed for', key, err.message || err);
  }
};

const upsertRoom = async (code, data) => {
  try {
    const payload = { code: String(code), data };
    const { error } = await supabase.from('rooms').upsert(payload, { returning: 'minimal' });
    if (error) throw error;
    console.log('Upserted room', code);
  } catch (err) {
    console.warn('Room upsert failed for', code, err.message || err);
  }
};

(async () => {
  console.log('Starting migration to Supabase...');

  for (const [key, value] of Object.entries(dump)) {
    // Prefer to store structured JSON where possible
    const parsed = value;
    // If this is the `rooms` key and it's an object, upsert each room into rooms table
    if (key === 'rooms' && parsed && typeof parsed === 'object') {
      for (const [code, roomData] of Object.entries(parsed)) {
        await upsertRoom(code, roomData);
      }
      // Also store the full rooms dump in kv for backup
      await upsertKV(key, parsed);
      continue;
    }

    // Generic KV upsert: store as JSONB
    await upsertKV(key, parsed);
  }

  console.log('Migration completed.');
  process.exit(0);
})();
