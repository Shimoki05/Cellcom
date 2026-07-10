// Simple echo upload endpoint for avatars.
// Accepts JSON { dataUrl } and returns { ok:true, url }
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, error: 'Method not allowed' });
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        const dataUrl = json.dataUrl;
        if (!dataUrl) return res.status(400).json({ ok:false, error: 'Missing dataUrl' });
        // In a real app, you'd persist this to object storage and return a hosted URL.
        // For now, echo back the same DataURL to let the client proceed.
        return res.json({ ok:true, url: dataUrl, id: Date.now() });
      } catch (err) {
        return res.status(400).json({ ok:false, error: 'Invalid JSON' });
      }
    });
  } catch (err) {
    console.error('upload-avatar error', err);
    return res.status(500).json({ ok:false, error: String(err) });
  }
};
