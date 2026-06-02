import { db, type LocalMessage } from "./offlineDb";
import { supabase } from "@/integrations/supabase/client";

function uuid() { return crypto.randomUUID(); }
function nowIso() { return new Date().toISOString(); }

export type ChatMessage = LocalMessage;

/** Get all messages between two users (merging local pending + synced) */
export async function getConversation(userA: string, userB: string): Promise<ChatMessage[]> {
  const all = await db.messages
    .where("sender_id").equals(userA).or("sender_id").equals(userB)
    .toArray();
  return all
    .filter((m) =>
      (m.sender_id === userA && m.receiver_id === userB) ||
      (m.sender_id === userB && m.receiver_id === userA)
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function getAllUserMessages(userId: string): Promise<ChatMessage[]> {
  const all = await db.messages.toArray();
  return all
    .filter((m) => m.sender_id === userId || m.receiver_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function cacheMessage(msg: Omit<LocalMessage, "_pending" | "_localBlob">) {
  await db.messages.put({ ...msg, _pending: false, _synced: true, _updated_at: nowIso() });
}

/** Send text message: try online, else queue offline */
export async function sendText(senderId: string, receiverId: string, content: string): Promise<ChatMessage> {
  const id = uuid();
  const created_at = nowIso();
  const local: LocalMessage = {
    id, sender_id: senderId, receiver_id: receiverId,
    content, attachment_type: "text", attachment_url: null, attachment_name: null,
    read: false, created_at, _pending: true, _synced: false, _updated_at: created_at,
  };
  await db.messages.put(local);

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase.from("messages").insert({
        id, sender_id: senderId, receiver_id: receiverId,
        content, attachment_type: "text",
      }).select().maybeSingle();
      if (error) throw error;
      if (data) {
        await db.messages.put({ ...local, ...data, _pending: false, _synced: true });
        return { ...local, ...data, _pending: false } as LocalMessage;
      }
    } catch {
      // stay pending
    }
  }
  return local;
}

/** Send attachment: try online upload, else cache blob locally to retry later */
export async function sendAttachment(
  senderId: string, receiverId: string, file: File, type: "audio" | "document"
): Promise<ChatMessage> {
  const id = uuid();
  const created_at = nowIso();
  const localUrl = URL.createObjectURL(file);
  const local: LocalMessage = {
    id, sender_id: senderId, receiver_id: receiverId,
    content: null, attachment_type: type, attachment_url: localUrl, attachment_name: file.name,
    read: false, created_at, _pending: true, _localBlob: file, _synced: false, _updated_at: created_at,
  };
  await db.messages.put(local);

  if (navigator.onLine) {
    await flushOnePending(local);
  }
  return local;
}

async function flushOnePending(msg: LocalMessage): Promise<void> {
  try {
    let attachment_url = msg.attachment_url;
    let attachment_name = msg.attachment_name;
    if (msg._localBlob && msg.attachment_type && msg.attachment_type !== "text") {
      const ext = (msg.attachment_name || "bin").split(".").pop() || "bin";
      const path = `${msg.sender_id}/${Date.now()}-${msg.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("message-attachments")
        .upload(path, msg._localBlob);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("message-attachments").getPublicUrl(path);
      attachment_url = urlData.publicUrl;
      attachment_name = msg.attachment_name;
    }
    const { data, error } = await supabase.from("messages").insert({
      id: msg.id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      content: msg.content,
      attachment_type: msg.attachment_type,
      attachment_url,
      attachment_name,
    }).select().maybeSingle();
    if (error) throw error;
    if (data) {
      await db.messages.put({
        ...msg,
        attachment_url: data.attachment_url,
        attachment_name: data.attachment_name,
        _pending: false,
        _localBlob: null,
        _synced: true,
        _updated_at: nowIso(),
      });
    }
  } catch (e) {
    console.warn("[Messages] flush pending failed", e);
  }
}

/** Flush all pending messages — call on reconnect */
export async function flushPendingMessages(): Promise<number> {
  if (!navigator.onLine) return 0;
  const pending = await db.messages.filter((m) => m._pending === true).toArray();
  for (const m of pending) {
    await flushOnePending(m);
  }
  return pending.length;
}

export async function markMessagesRead(senderId: string, receiverId: string) {
  // mark in Supabase (will broadcast via realtime) and locally
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("sender_id", senderId)
    .eq("receiver_id", receiverId)
    .eq("read", false);
  const locals = await db.messages.where("sender_id").equals(senderId).toArray();
  for (const m of locals) {
    if (m.receiver_id === receiverId && !m.read) {
      await db.messages.put({ ...m, read: true, _updated_at: nowIso() });
    }
  }
}

/** Pull all messages for current user, cache locally */
export async function pullMessages(userId: string) {
  try {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true });
    if (data) {
      for (const m of data) {
        const existing = await db.messages.get(m.id);
        if (!existing || !existing._pending) {
          await db.messages.put({
            ...(m as LocalMessage),
            _pending: false,
            _synced: true,
            _updated_at: nowIso(),
          });
        }
      }
    }
  } catch {
    // offline — use what we have
  }
}

/** Auto-flush on reconnect */
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushPendingMessages(); });
}
