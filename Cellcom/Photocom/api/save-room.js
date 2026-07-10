// Vercel Serverless: Save room using Supabase service role key (bypass RLS)
// Expects JSON body with the room payload matching your `rooms` table columns.

module.exports = async (req, res) => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env' });
    }

    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const payload = req.body;
    if (!payload || typeof payload !== 'object') return res.status(400).json({ ok: false, error: 'Invalid payload' });

    const sanitizeRoom = (p) => {
      const out = {};
      if (p.code) out.code = String(p.code);
      if (p.room_code) out.room_code = String(p.room_code);
      if (p.teacher_id) out.teacher_id = String(p.teacher_id);
      if (typeof p.active !== 'undefined') out.active = !!p.active;
      if (typeof p.locked !== 'undefined') out.locked = !!p.locked;
      if (p.part_id) out.part_id = String(p.part_id);
      if (p.created_at) out.created_at = String(p.created_at);
      if (Array.isArray(p.joined_students)) out.joined_students = p.joined_students;
      if (Array.isArray(p.chat_messages)) out.chat_messages = p.chat_messages;
      return out;
    };

    const room = sanitizeRoom(payload);

    if (!room.teacher_id) return res.status(400).json({ ok: false, error: 'Missing teacher_id' });

    const base = SUPABASE_URL.replace(/\/$/, '');
    const teacherCheckUrl = `${base}/rest/v1/teachers?id=eq.${encodeURIComponent(room.teacher_id)}&select=id`;
    const tc = await fetch(teacherCheckUrl, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (!tc.ok) {
      const ttext = await tc.text();
      return res.status(502).json({ ok: false, error: 'Failed to validate teacher_id', detail: ttext });
    }
    const tbody = await tc.json();
    if (!Array.isArray(tbody) || tbody.length === 0) return res.status(403).json({ ok: false, error: 'teacher_id not found' });

    const tryPostRoom = async (payload, conflictKey) => {
      const url = conflictKey ? `${base}/rest/v1/rooms?on_conflict=${encodeURIComponent(conflictKey)}` : `${base}/rest/v1/rooms`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=representation,resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
      const text = await r.text();
      let body = null;
      try { body = JSON.parse(text); } catch (e) { body = text; }
      return { r, body };
    };

    const parseMissingColumns = (message) => {
      const missing = [];
      if (!message || typeof message !== 'string') return missing;
      const re = /could not find the '([^']+)' column/gi;
      let m;
      while ((m = re.exec(message))) {
        missing.push(m[1]);
      }
      return missing;
    };

    const attemptPersist = async (initialPayload, conflictKey) => {
      let p = Object.assign({}, initialPayload);
      let conflict = conflictKey;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { r, body } = await tryPostRoom(p, conflict);
        if (r.ok) return { success: true, status: r.status, body };

        const message = (body && body.message) || String(body || '');
        const missing = parseMissingColumns(message);
        if (missing.length === 0) return { success: false, status: r.status, error: body };

        for (const col of missing) {
          const camel = col.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          if (p.hasOwnProperty(col)) delete p[col];
          if (p.hasOwnProperty(camel)) delete p[camel];
        }
        if (p.room_code) {
          conflict = 'room_code';
        } else if (p.code) {
          conflict = 'code';
        } else {
          conflict = null;
        }
      }
      return { success: false, status: 400, error: 'max attempts' };
    };

    const result = await attemptPersist(room, room.room_code ? 'room_code' : (room.code ? 'code' : null));
    if (!result.success) {
      return res.status(result.status || 400).json({ ok: false, status: result.status, body: result.error });
    }

    return res.json({ ok: true, status: result.status, body: result.body });
  } catch (err) {
    console.error('save-room error', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
