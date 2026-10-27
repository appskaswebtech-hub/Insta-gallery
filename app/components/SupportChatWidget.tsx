import { useEffect, useRef, useState, useCallback } from "react";

type Message = {
  id: string;
  sender: "shop" | "admin";
  body: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  createdAt: string;
};

const WIDGET_CSS = `
.igsc-launcher{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#1f2937,#0f766e);color:#fff;border:none;box-shadow:0 8px 24px rgba(15,118,110,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:9999;transition:transform .15s ease,box-shadow .15s ease}
.igsc-launcher:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(15,118,110,0.4)}
.igsc-badge{position:absolute;top:-4px;right:-4px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid #fff}
.igsc-panel{position:fixed;right:20px;bottom:88px;width:340px;max-width:calc(100vw - 32px);height:460px;max-height:calc(100vh - 140px);background:#fff;border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,0.18);display:flex;flex-direction:column;overflow:hidden;z-index:9999;border:1px solid rgba(0,0,0,0.06);font-family:inherit}
.igsc-head{background:linear-gradient(135deg,#1f2937,#0f766e);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.igsc-head-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700}
.igsc-head-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;flex-shrink:0}
.igsc-head-close{background:none;border:none;color:#fff;opacity:.75;cursor:pointer;padding:4px;display:flex}
.igsc-head-close:hover{opacity:1}
.igsc-head-actions{display:flex;align-items:center;gap:10px}
.igsc-head-end{background:none;border:1px solid rgba(255,255,255,0.3);color:#fff;opacity:.85;cursor:pointer;font-size:11px;font-weight:600;padding:4px 9px;border-radius:7px}
.igsc-head-end:hover{opacity:1;border-color:#fff}
.igsc-head-end:disabled{opacity:.5;cursor:not-allowed}
.igsc-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#fafafa}
.igsc-empty{margin:auto;text-align:center;color:#9ca3af;font-size:12.5px;padding:0 20px}
.igsc-row{display:block;text-align:left;clear:both}
.igsc-row--shop{text-align:right}
.igsc-bubble{display:inline-block;text-align:left;max-width:78%;padding:8px 12px;border-radius:14px;font-size:13px;line-height:1.5;white-space:normal;overflow-wrap:break-word}
.igsc-row--shop .igsc-bubble{background:#0f766e;color:#fff;border-bottom-right-radius:4px}
.igsc-row--admin .igsc-bubble{background:#fff;color:#1a1a1a;border:1px solid rgba(0,0,0,0.08);border-bottom-left-radius:4px}
.igsc-attach{display:flex;align-items:center;gap:6px;margin-top:6px;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,0.06);font-size:12px;text-decoration:none;color:inherit}
.igsc-row--shop .igsc-attach{background:rgba(255,255,255,0.18)}
.igsc-attach-img{max-width:180px;max-height:140px;border-radius:8px;display:block;margin-top:6px}
.igsc-time{font-size:10px;color:#b0a8ab;margin-top:3px}
.igsc-row--shop .igsc-time{text-align:right}
.igsc-foot{flex-shrink:0;border-top:1px solid rgba(0,0,0,0.06);padding:10px 12px;background:#fff}
.igsc-filechip{display:flex;align-items:center;gap:6px;font-size:11.5px;background:#f0fdfa;color:#115e59;border:1px solid rgba(15,118,110,0.3);border-radius:8px;padding:5px 8px;margin-bottom:8px}
.igsc-filechip button{margin-left:auto;background:none;border:none;color:#b45454;cursor:pointer;font-size:12px}
.igsc-inputrow{display:flex;align-items:flex-end;gap:8px}
.igsc-textarea{flex:1;resize:none;border:1.5px solid #e5e0e2;border-radius:12px;padding:9px 12px;font:inherit;font-size:13px;max-height:90px;outline:none;transition:border-color .15s}
.igsc-textarea:focus{border-color:#0f766e}
.igsc-iconbtn{width:34px;height:34px;flex-shrink:0;border-radius:10px;border:1.5px solid #e5e0e2;background:#fff;color:#6b7280;display:flex;align-items:center;justify-content:center;cursor:pointer}
.igsc-iconbtn:hover{border-color:#0f766e;color:#0f766e}
.igsc-sendbtn{width:34px;height:34px;flex-shrink:0;border-radius:10px;border:none;background:#0f766e;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
.igsc-sendbtn:disabled{opacity:.5;cursor:not-allowed}
.igsc-err{font-size:11.5px;color:#dc2626;margin-bottom:6px}
.igsc-closed-row{display:flex;flex-direction:column;align-items:center;gap:8px;padding:4px 0}
.igsc-closed-note{font-size:11.5px;color:#9ca3af;text-align:center}
.igsc-newchat-btn{background:#0f766e;color:#fff;border:none;border-radius:9px;padding:9px 18px;font-size:12.5px;font-weight:700;cursor:pointer}
.igsc-newchat-btn:disabled{opacity:.6;cursor:not-allowed}
.igsc-typing{font-style:italic;opacity:.65}
`;

// Floating support chat, available on every /app/* page -- the store owner
// reaching kaswebtech's own support team (via Supportly, the shared admin
// dashboard), separate from this app's own Instagram feed features.
// Mounted once in app/routes/app.tsx so it persists across navigation.
// Mechanics ported from WishKeeper's widget: polling-based (no WebSocket in
// production), with close/reopen/typing/auto-reply.
export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentAt = useRef(0);
  const [closed, setClosed] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [ending, setEnding] = useState(false);
  const [starting, setStarting] = useState(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  useEffect(() => {
    fetch("/app/support/messages")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.messages) {
          setMessages(d.messages);
          setLoaded(true);
          setClosed(Boolean(d.thread?.closedAt));
          scrollToBottom();
        }
      })
      .catch(() => {});
  }, [scrollToBottom]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/app/support/messages")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d?.messages) return;
          setMessages((prev) => {
            const prevIds = new Set(prev.map((m: Message) => m.id));
            const incoming: Message[] = d.messages;
            const fresh = incoming.filter((m) => !prevIds.has(m.id));
            if (fresh.length === 0) return prev;
            const adminFresh = fresh.filter((m) => m.sender === "admin");
            if (adminFresh.length > 0) {
              setUnread((n) => (open ? 0 : n + adminFresh.length));
            }
            scrollToBottom();
            return [...prev, ...fresh];
          });

          const isClosed = Boolean(d.thread?.closedAt);
          setClosed((wasClosed) => {
            if (isClosed && !wasClosed) setOpen(false);
            return isClosed;
          });

          const typingAt = d.thread?.adminTypingAt ? new Date(d.thread.adminTypingAt).getTime() : 0;
          setAdminTyping(typingAt > 0 && Date.now() - typingAt < 8000);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      setUnread(0);
      scrollToBottom();
      fetch("/app/support/messages?seen=1").catch(() => {});
    }
  }, [open, scrollToBottom]);

  const send = useCallback(() => {
    if (sending) return;
    if (!text.trim() && !file) return;
    setSending(true);
    setErr(null);

    const form = new FormData();
    form.set("body", text.trim());
    if (file) form.set("file", file);

    fetch("/app/support/messages", { method: "POST", body: form })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) {
          setErr(d?.error || "Could not send message.");
          return;
        }
        setMessages((prev) => (prev.some((m) => m.id === d.message.id) ? prev : [...prev, d.message]));
        setText("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        scrollToBottom();
      })
      .catch(() => setErr("Could not send message. Check your connection."))
      .finally(() => setSending(false));
  }, [text, file, sending, scrollToBottom]);

  const endChat = useCallback(() => {
    if (ending) return;
    setEnding(true);
    fetch("/app/support/close", { method: "POST" })
      .then(() => {
        setClosed(true);
        setOpen(false);
      })
      .catch(() => {})
      .finally(() => setEnding(false));
  }, [ending]);

  const startNewChat = useCallback(() => {
    if (starting) return;
    setStarting(true);
    fetch("/app/support/reopen", { method: "POST" })
      .then(() => {
        setMessages([]);
        setClosed(false);
      })
      .catch(() => {})
      .finally(() => setStarting(false));
  }, [starting]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <style>{WIDGET_CSS}</style>

      {!open && (
        <button className="igsc-launcher" onClick={() => setOpen(true)} aria-label="Open support chat">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          {unread > 0 && <span className="igsc-badge">{unread > 9 ? "9+" : unread}</span>}
        </button>
      )}

      {open && (
        <div className="igsc-panel">
          <div className="igsc-head">
            <div className="igsc-head-title">
              <span className="igsc-head-dot" />
              Chat with Support
            </div>
            <div className="igsc-head-actions">
              {!closed && messages.length > 0 && (
                <button type="button" className="igsc-head-end" onClick={endChat} disabled={ending}>
                  End chat
                </button>
              )}
              <button className="igsc-head-close" onClick={() => setOpen(false)} aria-label="Close chat">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="igsc-body" ref={listRef}>
            {loaded && messages.length === 0 && (
              <div className="igsc-empty">
                Send us a message and we will get back to you here. You can attach a screenshot or a document too.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={"igsc-row igsc-row--" + m.sender}>
                <div>
                  <div className="igsc-bubble">
                    {m.body}
                    {m.attachmentUrl && m.attachmentType?.startsWith("image/") && (
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
                        <img src={m.attachmentUrl} alt={m.attachmentName || "attachment"} className="igsc-attach-img" />
                      </a>
                    )}
                    {m.attachmentUrl && !m.attachmentType?.startsWith("image/") && (
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="igsc-attach">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        {m.attachmentName || "Attachment"}
                      </a>
                    )}
                  </div>
                  <div className="igsc-time">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
            {adminTyping && !closed && (
              <div className="igsc-row igsc-row--admin">
                <div className="igsc-bubble igsc-typing">typing...</div>
              </div>
            )}
          </div>

          <div className="igsc-foot">
            {closed ? (
              <div className="igsc-closed-row">
                <span className="igsc-closed-note">This conversation was closed by support.</span>
                <button type="button" className="igsc-newchat-btn" onClick={startNewChat} disabled={starting}>
                  {starting ? "Starting..." : "Start new chat"}
                </button>
              </div>
            ) : (
              <>
                {err && <div className="igsc-err">{err}</div>}
                {file && (
                  <div className="igsc-filechip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>
                    {file.name}
                    <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>×</button>
                  </div>
                )}
                <div className="igsc-inputrow">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    style={{ display: "none" }}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <button type="button" className="igsc-iconbtn" onClick={() => fileInputRef.current?.click()} aria-label="Attach a file">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                  </button>
                  <textarea
                    className="igsc-textarea"
                    rows={1}
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      const now = Date.now();
                      if (now - lastTypingSentAt.current > 2000) {
                        lastTypingSentAt.current = now;
                        fetch("/app/support/typing", { method: "POST" }).catch(() => {});
                      }
                    }}
                    onKeyDown={onKeyDown}
                  />
                  <button type="button" className="igsc-sendbtn" onClick={send} disabled={sending || (!text.trim() && !file)} aria-label="Send">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
