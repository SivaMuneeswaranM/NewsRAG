import { useEffect, useRef, useState } from 'react';
import './chat.scss';

const API = import.meta.env?.VITE_API_BASE || '';

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const ct = res.headers.get('content-type') || '';
  let body = null;
  try { body = ct.includes('application/json') ? await res.json() : await res.text(); }
  catch { body = null; }
  return { ok: res.ok, status: res.status, body };
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

export default function Chat() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages]   = useState([]);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [booting, setBooting]     = useState(true);
  const [error, setError]         = useState('');
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const bottomRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);

  // create session + load history
  useEffect(() => {
    let live = true;
    (async () => {
      setBooting(true);
      const r1 = await fetchJson(`${API}/session`, { method: 'POST' });
      if (!live) return;
      if (!r1.ok || !r1.body?.sessionId) {
        setError(`Failed to create session (${r1.status})`);
        setBooting(false);
        return;
      }
      const sid = r1.body.sessionId;
      setSessionId(sid);

      const r2 = await fetchJson(`${API}/session/${sid}/history`, { method: 'GET' });
      if (!live) return;
      const hist = Array.isArray(r2.body?.messages) ? r2.body.messages : [];
      setMessages(hist);
      setBooting(false);
      inputRef.current?.focus();
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    })();
    return () => { live = false; };
  }, []);

  // scroll awareness
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
      setAtBottom(nearBottom);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // auto-scroll on new message if already near bottom
  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, atBottom]);

  async function handleSend() {
    const msg = text.trim();
    if (!msg || !sessionId || sending) return;

    setMessages(prev => [...prev, { role: 'user', content: msg, ts: Date.now() }]);
    setText('');
    setSending(true);
    setError('');

    const r = await fetchJson(`${API}/session/${sessionId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });

    if (r.ok && r.body) {
      const answer = typeof r.body.answer === 'string'
        ? r.body.answer
        : (typeof r.body === 'string' ? r.body : 'No answer.');
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: answer, ts: Date.now(), sources: r.body.sources || [] }
      ]);
    } else {
      const fallback = typeof r.body === 'string' && r.body
        ? r.body
        : (r.body?.answer || `Request failed (${r.status}).`);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: fallback, ts: Date.now() }
      ]);
      setError(`Chat error (${r.status})`);
    }

    setSending(false);
    inputRef.current?.focus();
  }

  async function handleClear() {
    if (!sessionId) return;
    await fetchJson(`${API}/session/${sessionId}/clear`, { method: 'POST' });
    setMessages([]);
    inputRef.current?.focus();
  }

  function copyText(txt) {
    if (!txt) return;
    navigator.clipboard?.writeText(txt).catch(() => {});
  }

  const list = Array.isArray(messages) ? messages : [];

  return (
    <div className="chat-shell">
      <div className="chat-header">
        <div className="title">
          <span className="logo">🗞️</span>
          <span>RAG News Chatbot</span>
        </div>
        <div className="subtitle">
          Ask questions about the latest Reuters articles.
        </div>
        <div className="session">
          session: {sessionId ? `${sessionId.slice(0,8)}…` : '—'}
        </div>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {booting && (
          <div className="sys-msg">Starting… creating session…</div>
        )}
        {error && (
          <div className="sys-msg error">{error}</div>
        )}

        {list.map((m, i) => (
          <div key={i} className={`bubble-row ${m.role}`}>
            <div className="avatar">
              {m.role === 'user' ? '🧑‍💻' : '🤖'}
            </div>
            <div className="bubble">
              <div className="meta">
                <span className="who">{m.role === 'user' ? 'You' : 'Assistant'}</span>
                <span className="dot">•</span>
                <span className="ago">{timeAgo(m.ts)}</span>
                {m.role === 'assistant' && (
                  <button className="action" onClick={() => copyText(m.content)} title="Copy">
                    ⧉
                  </button>
                )}
              </div>
              <div className="content">{m.content}</div>

              {Array.isArray(m.sources) && m.sources.length > 0 && (
                <div className="sources">
                  {m.sources.map((s, idx) => (
                    <a key={idx} className="chip" href={s.url} target="_blank" rel="noreferrer">
                      {s.title || s.url}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="bubble-row assistant">
            <div className="avatar">🤖</div>
            <div className="bubble">
              <div className="typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
        {!atBottom && (
          <button
            className="scroll-bottom"
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            title="Scroll to latest"
          >
            ↓
          </button>
        )}
      </div>

      <div className="chat-footer">
        <div className="input-wrap">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) handleSend(); }}
            placeholder={sessionId ? 'Ask about the news…' : 'Starting…'}
            disabled={!sessionId}
          />
          <div className="buttons">
            <button className="btn send" onClick={handleSend} disabled={!sessionId || sending || !text.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
            <button className="btn reset" onClick={handleClear} disabled={!sessionId || sending}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
