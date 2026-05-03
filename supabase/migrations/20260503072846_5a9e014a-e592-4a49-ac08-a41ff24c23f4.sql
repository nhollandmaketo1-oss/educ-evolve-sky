
-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT,
  attachment_type TEXT CHECK (attachment_type IN ('text', 'audio', 'document')),
  attachment_url TEXT,
  attachment_name TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Everyone in the app can read/write messages (app-level auth via app_users)
CREATE POLICY "Allow all access to messages"
ON public.messages
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_messages_sender ON public.messages (sender_id);
CREATE INDEX idx_messages_receiver ON public.messages (receiver_id);
CREATE INDEX idx_messages_created ON public.messages (created_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload message attachments"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'message-attachments');

CREATE POLICY "Anyone can read message attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'message-attachments');
