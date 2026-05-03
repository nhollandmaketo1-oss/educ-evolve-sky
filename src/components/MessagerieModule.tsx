import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getAllUsers, type AppUser } from "@/lib/auth";
import { Send, Paperclip, Mic, FileText, Image, StopCircle, ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  attachment_type: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  read: boolean;
  created_at: string;
}

interface ConversationPreview {
  user: AppUser;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function MessagerieModule() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load users
  useEffect(() => {
    getAllUsers().then(setUsers);
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    const { data: allMessages } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order("created_at", { ascending: false });

    if (!allMessages) return;

    const convMap = new Map<string, { messages: Message[] }>();
    for (const msg of allMessages as Message[]) {
      const otherId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(otherId)) convMap.set(otherId, { messages: [] });
      convMap.get(otherId)!.messages.push(msg);
    }

    const previews: ConversationPreview[] = [];
    for (const u of users) {
      if (u.id === currentUser.id) continue;
      const conv = convMap.get(u.id);
      const lastMessage = conv?.messages[0] || null;
      const unreadCount = conv?.messages.filter(m => m.receiver_id === currentUser.id && !m.read).length || 0;
      previews.push({ user: u, lastMessage, unreadCount });
    }

    // Sort: unread first, then by last message time
    previews.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      const ta = a.lastMessage?.created_at || "";
      const tb = b.lastMessage?.created_at || "";
      return tb.localeCompare(ta);
    });

    setConversations(previews);
  }, [currentUser, users]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async () => {
    if (!currentUser || !selectedUser) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
      .order("created_at", { ascending: true });

    if (data) setMessages(data as Message[]);

    // Mark as read
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", selectedUser.id)
      .eq("receiver_id", currentUser.id)
      .eq("read", false);
  }, [currentUser, selectedUser]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(scrollToBottom, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id === currentUser.id || newMsg.receiver_id === currentUser.id) {
          if (selectedUser && (newMsg.sender_id === selectedUser.id || newMsg.receiver_id === selectedUser.id)) {
            setMessages(prev => [...prev, newMsg]);
            // Auto-mark as read
            if (newMsg.sender_id === selectedUser.id) {
              supabase.from("messages").update({ read: true }).eq("id", newMsg.id);
            }
          }
          loadConversations();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, selectedUser, loadConversations]);

  // Send text message
  const sendMessage = async () => {
    if (!text.trim() || !currentUser || !selectedUser || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: text.trim(),
      attachment_type: "text",
    });
    if (error) toast.error("Erreur d'envoi");
    else setText("");
    setSending(false);
  };

  // Upload attachment
  const uploadAttachment = async (file: File, type: "audio" | "document") => {
    if (!currentUser || !selectedUser) return;
    setSending(true);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${currentUser.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("message-attachments").upload(path, file);
    if (uploadErr) { toast.error("Erreur upload"); setSending(false); return; }

    const { data: urlData } = supabase.storage.from("message-attachments").getPublicUrl(path);

    await supabase.from("messages").insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: null,
      attachment_type: type,
      attachment_url: urlData.publicUrl,
      attachment_name: file.name,
    });
    setSending(false);
  };

  // Record audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: "audio/webm" });
        uploadAttachment(file, "audio");
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Accès au microphone refusé");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // File picker
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAttachment(file, "document");
    e.target.value = "";
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const filteredConversations = conversations.filter(c =>
    c.user.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAttachment = (msg: Message) => {
    if (msg.attachment_type === "audio" && msg.attachment_url) {
      return <audio src={msg.attachment_url} controls className="max-w-[220px]" />;
    }
    if (msg.attachment_type === "document" && msg.attachment_url) {
      return (
        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs underline text-primary">
          <FileText className="w-4 h-4" />
          {msg.attachment_name || "Document"}
        </a>
      );
    }
    return null;
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  // ── Conversation list view ──
  if (!selectedUser) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold font-[family-name:var(--font-display)] mb-3">Messagerie</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un utilisateur…"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Aucun utilisateur trouvé</p>
          )}
          {filteredConversations.map(conv => (
            <button
              key={conv.user.id}
              onClick={() => setSelectedUser(conv.user)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/50 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {conv.user.photo ? (
                  <img src={conv.user.photo} className="w-full h-full rounded-full object-cover" alt="" />
                ) : getInitials(conv.user.display_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate">{conv.user.display_name}</span>
                  {conv.lastMessage && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(conv.lastMessage.created_at)}
                    </span>
                  )}
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
          {selectedUser.photo ? (
            <img src={selectedUser.photo} className="w-full h-full rounded-full object-cover" alt="" />
          ) : getInitials(selectedUser.display_name)}
        </div>
        <div>
          <p className="font-semibold text-sm">{selectedUser.display_name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{selectedUser.role}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-muted/20">
        {messages.map(msg => {
          const isMine = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border rounded-bl-md"}`}>
                {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                {renderAttachment(msg)}
                <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"} text-right`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-border bg-card flex items-center gap-2">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="*/*" />
        <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-muted rounded-xl text-muted-foreground" title="Document">
          <Paperclip className="w-5 h-5" />
        </button>

        {recording ? (
          <button onClick={stopRecording} className="p-2 text-red-500 animate-pulse" title="Arrêter">
            <StopCircle className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={startRecording} className="p-2 hover:bg-muted rounded-xl text-muted-foreground" title="Audio">
            <Mic className="w-5 h-5" />
          </button>
        )}

        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Écrire un message…"
          className="flex-1 px-3 py-2 rounded-xl bg-muted/50 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          disabled={recording}
        />

        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-40 hover:opacity-90"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
