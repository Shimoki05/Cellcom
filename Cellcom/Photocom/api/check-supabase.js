// Vercel Serverless: Check Supabase tables (teachers, students)
// Reads SUPABASE_URL and SUPABASE_ANON_KEY from environment variables

module.exports = async (req, res) => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY in env' });
    }

    const fetchTable = async (table) => {
      const base = SUPABASE_URL.replace(/\/$/, '');
      const endpoint = `${base}/rest/v1/${table}?select=id&limit=1`;
      const r = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'count=exact'
        }
      });
      const status = r.status;
      let bodyText = null;
      try { bodyText = await r.text(); } catch(e) { bodyText = null; }

      const contentRange = r.headers.get('content-range') || r.headers.get('Content-Range');
      let count = null;
      if (contentRange && contentRange.indexOf('/') !== -1) {
        const parts = contentRange.split('/');
        count = Number(parts[1]) || null;
      }

      let sample = null;
      try { sample = bodyText ? JSON.parse(bodyText) : null; } catch(e) { sample = bodyText; }

      return { table, status, bodyText, count, sample };
    };

    const teachers = await fetchTable('teachers');
    const students = await fetchTable('students');
    const rooms = await fetchTable('rooms');

    return res.json({ ok: true, teachers, students, rooms });
  } catch (err) {
    console.error('check-supabase error', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
