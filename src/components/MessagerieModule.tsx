import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getAllUsers, type AppUser } from "@/lib/auth";
import { db } from "@/lib/offlineDb";
import {
  sendText, sendAttachment, getConversation, markMessagesRead, pullMessages,
  flushPendingMessages, type ChatMessage,
} from "@/lib/messagesStore";
import {
  Send, Paperclip, Mic, FileText, StopCircle, ArrowLeft, Search,
  Check, CheckCheck, Trash2, Send as SendIcon, Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ConversationPreview {
  user: AppUser;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

export default function MessagerieModule() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Load users + pull cached messages
  useEffect(() => {
    getAllUsers().then(setUsers);
    if (currentUser) pullMessages(currentUser.id);
  }, [currentUser]);

  // Conversations preview (from local DB)
  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    const all = await db.messages.toArray();
    const map = new Map<string, ChatMessage[]>();
    for (const m of all) {
      if (m.sender_id !== currentUser.id && m.receiver_id !== currentUser.id) continue;
      const other = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
      if (!map.has(other)) map.set(other, []);
      map.get(other)!.push(m);
    }
    const previews: ConversationPreview[] = [];
    for (const u of users) {
      if (u.id === currentUser.id) continue;
      const list = (map.get(u.id) || []).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const lastMessage = list[0] || null;
      const unreadCount = list.filter((m) => m.receiver_id === currentUser.id && !m.read).length;
      previews.push({ user: u, lastMessage, unreadCount });
    }
    previews.sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      return (b.lastMessage?.created_at || "").localeCompare(a.lastMessage?.created_at || "");
    });
    setConversations(previews);
  }, [currentUser, users]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages of selected conversation (from local DB)
  const loadMessages = useCallback(async () => {
    if (!currentUser || !selectedUser) return;
    const conv = await getConversation(currentUser.id, selectedUser.id);
    setMessages(conv);
    // Mark incoming as read (locally + remotely)
    markMessagesRead(selectedUser.id, currentUser.id).catch(() => { /* */ });
  }, [currentUser, selectedUser]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(scrollToBottom, [messages]);

  // Online/offline + realtime
  useEffect(() => {
    if (!currentUser) return;

    const onOnline = async () => {
      const n = await flushPendingMessages();
      if (n > 0) toast.success(`${n} message(s) envoyé(s)`);
      await pullMessages(currentUser.id);
      loadConversations();
      loadMessages();
    };
    window.addEventListener("online", onOnline);

    const channel = supabase
      .channel("messages-rt-" + currentUser.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, async (payload) => {
        const m = (payload.new || payload.old) as ChatMessage | undefined;
        if (!m) return;
        if (m.sender_id !== currentUser.id && m.receiver_id !== currentUser.id) return;
        if (payload.eventType === "DELETE") {
          await db.messages.delete(m.id);
        } else {
          const existing = await db.messages.get(m.id);
          if (!existing || !existing._pending) {
            await db.messages.put({ ...(payload.new as ChatMessage), _pending: false, _synced: true });
          } else {
            // local pending; merge read flag updates from server
            await db.messages.put({ ...existing, read: (payload.new as ChatMessage).read });
          }
        }
        loadConversations();
        if (selectedUser && (m.sender_id === selectedUser.id || m.receiver_id === selectedUser.id)) {
          loadMessages();
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener("online", onOnline);
      supabase.removeChannel(channel);
    };
  }, [currentUser, selectedUser, loadConversations, loadMessages]);

  // Send text
  const handleSendText = async () => {
    if (!text.trim() || !currentUser || !selectedUser || sending) return;
    setSending(true);
    const value = text.trim();
    setText("");
    await sendText(currentUser.id, selectedUser.id, value);
    await loadMessages();
    await loadConversations();
    setSending(false);
  };

  // ── Audio recording ──
  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const startRecording = async () => {
    try {
      cancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
        setRecordSeconds(0);
        if (cancelledRef.current || !currentUser || !selectedUser) return;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: "audio/webm" });
        setSending(true);
        await sendAttachment(currentUser.id, selectedUser.id, file, "audio");
        await loadMessages();
        await loadConversations();
        setSending(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Accès au microphone refusé");
    }
  };

  const sendRecording = () => {
    cancelledRef.current = false;
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    mediaRecorderRef.current?.stop();
    setRecording(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    stopTimer();
    setRecordSeconds(0);
  };

  // File picker
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentUser || !selectedUser) return;
    setSending(true);
    await sendAttachment(currentUser.id, selectedUser.id, file, "document");
    await loadMessages();
    await loadConversations();
    setSending(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatSeconds = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const filteredConversations = conversations.filter((c) =>
    c.user.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAttachment = (msg: ChatMessage) => {
    if (msg.attachment_type === "audio" && msg.attachment_url) {
      return <audio src={msg.attachment_url} controls className="max-w-[220px]" />;
    }
    if (msg.attachment_type === "document" && msg.attachment_url) {
      return (
        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs underline">
          <FileText className="w-4 h-4" />
          {msg.attachment_name || "Document"}
        </a>
      );
    }
    return null;
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const ReadReceipt = ({ msg }: { msg: ChatMessage }) => {
    if (msg._pending) return <Loader2 className="w-3 h-3 animate-spin opacity-70" />;
    if (msg.read) return <CheckCheck className="w-3.5 h-3.5 text-sky-300" />;
    return <Check className="w-3.5 h-3.5 opacity-70" />;
  };

  // ── Conversation list view ──
  if (!selectedUser) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold font-[family-name:var(--font-display)] mb-3">Messagerie</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un utilisateur…"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Aucun utilisateur trouvé</p>
          )}
          {filteredConversations.map((conv) => (
            <button key={conv.user.id} onClick={() => setSelectedUser(conv.user)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/50 text-left">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {conv.user.photo ? <img src={conv.user.photo} className="w-full h-full rounded-full object-cover" alt="" /> : getInitials(conv.user.display_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate">{conv.user.display_name}</span>
                  {conv.lastMessage && <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(conv.lastMessage.created_at)}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage?.content
                      ? conv.lastMessage.content.slice(0, 40)
                      : conv.lastMessage?.attachment_type === "audio" ? "🎤 Audio"
                      : conv.lastMessage?.attachment_type === "document" ? "📎 Document"
                      : "Pas de message"}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Chat view ──
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button onClick={() => { setSelectedUser(null); loadConversations(); }} className="p-1 hover:bg-muted rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {selectedUser.photo ? <img src={selectedUser.photo} className="w-full h-full rounded-full object-cover" alt="" /> : getInitials(selectedUser.display_name)}
        </div>
        <div>
          <p className="font-semibold text-sm">{selectedUser.display_name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{selectedUser.role}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-muted/20">
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border rounded-bl-md"}`}>
                {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                {renderAttachment(msg)}
                <div className={`flex items-center gap-1 mt-1 justify-end text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  <span>{formatTime(msg.created_at)}</span>
                  {isMine && <ReadReceipt msg={msg} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Recording bar — visible while recording */}
      {recording ? (
        <div className="px-3 py-3 border-t border-border bg-destructive/5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <button onClick={cancelRecording} className="p-2 rounded-full bg-muted text-foreground hover:bg-muted/70" title="Annuler">
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
            <div className="flex-1 flex items-center gap-1 h-8 overflow-hidden">
              {Array.from({ length: 30 }).map((_, i) => (
                <span key={i} className="w-1 rounded-full bg-destructive/70 animate-pulse"
                  style={{ height: `${20 + Math.sin((recordSeconds + i) * 0.7) * 12 + Math.random() * 8}px`, animationDelay: `${i * 50}ms` }} />
              ))}
            </div>
            <span className="text-sm font-mono font-semibold text-destructive tabular-nums">{formatSeconds(recordSeconds)}</span>
          </div>
          <button onClick={sendRecording} className="p-2.5 rounded-full bg-primary text-primary-foreground hover:opacity-90" title="Envoyer">
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="px-3 py-2 border-t border-border bg-card flex items-center gap-2">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="*/*" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-muted rounded-xl text-muted-foreground" title="Document" disabled={sending}>
            <Paperclip className="w-5 h-5" />
          </button>
          <button onClick={startRecording} className="p-2 hover:bg-muted rounded-xl text-muted-foreground" title="Audio" disabled={sending}>
            <Mic className="w-5 h-5" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
            placeholder="Écrire un message…"
            className="flex-1 px-3 py-2 rounded-xl bg-muted/50 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={handleSendText} disabled={!text.trim() || sending}
            className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-40 hover:opacity-90">
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      )}

      <button onClick={() => { /* spacer */ }} className="sr-only" aria-hidden>
        <StopCircle className="w-0 h-0" />
      </button>
    </div>
  );
}
