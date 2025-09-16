const api = {
  async newSession() {
      const res = await fetch('/session', { method: 'POST' });
  // If the backend returned 500 (HTML or empty), this prevents JSON parse errors
     if (!res.ok) {
       const text = await res.text().catch(() => '');
       throw new Error(`POST /session failed ${res.status}: ${text || 'no body'}`);
     }
     return res.json(); 
  },
  async getHistory(sessionId) {
    const r = await fetch(`/session/${sessionId}/history`);
    return r.json();
  },
  async clearSession(sessionId) {
    const r = await fetch(`/session/${sessionId}`, { method: 'DELETE' });
    return r.json();
  },
  async chat(sessionId, message) {
    const r = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message })
    });
    return r.json();
  },
  stream(sessionId, q) {
    const es = new EventSource(`/chat/stream?session_id=${encodeURIComponent(sessionId)}&q=${encodeURIComponent(q)}`);
    return es;
  }
};

export default api;
