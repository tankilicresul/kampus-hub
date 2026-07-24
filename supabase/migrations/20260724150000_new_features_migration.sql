-- Migration: Eksik özellikler için yeni tablolar ve alanlar
-- 2026-07-24: tags, recurrence, workspace_messages, business_contacts, business_notes,
--             business_files, visit_reminders, quiet_hours, daily_update_manager_comments

-- ===== 1. tasks: tags + recurrence alanları =====
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly','monthly'));

-- ===== 2. task_attachments tablosu =====
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_task_attachments"
  ON public.task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_attachments.task_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_can_insert_task_attachments"
  ON public.task_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE t.id = task_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "owner_can_delete_task_attachments"
  ON public.task_attachments FOR DELETE
  USING (user_id = auth.uid());

-- ===== 3. workspace_messages tablosu (Chat) =====
CREATE TABLE IF NOT EXISTS public.workspace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 4000),
  reply_to_id UUID REFERENCES public.workspace_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_messages"
  ON public.workspace_messages FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_messages.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_can_send_messages"
  ON public.workspace_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "author_can_update_messages"
  ON public.workspace_messages FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_workspace_messages_workspace_id ON public.workspace_messages(workspace_id, created_at DESC);

-- Realtime enable
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_messages;

-- ===== 4. business_contacts tablosu =====
CREATE TABLE IF NOT EXISTS public.business_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.business_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_business_contacts"
  ON public.business_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE b.id = business_contacts.business_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_can_manage_business_contacts"
  ON public.business_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE b.id = business_contacts.business_id AND wm.user_id = auth.uid()
    )
  );

-- ===== 5. business_notes tablosu =====
CREATE TABLE IF NOT EXISTS public.business_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.business_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_manage_business_notes"
  ON public.business_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE b.id = business_notes.business_id AND wm.user_id = auth.uid()
    )
  );

-- ===== 6. visit_reminders tablosu =====
CREATE TABLE IF NOT EXISTS public.visit_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  notes TEXT,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.visit_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_manage_visit_reminders"
  ON public.visit_reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = visit_reminders.workspace_id AND wm.user_id = auth.uid()
    )
  );

-- ===== 7. profiles: quiet hours + notification prefs =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_quiet_start INTEGER DEFAULT 23 CHECK (notification_quiet_start >= 0 AND notification_quiet_start <= 23),
  ADD COLUMN IF NOT EXISTS notification_quiet_end INTEGER DEFAULT 8 CHECK (notification_quiet_end >= 0 AND notification_quiet_end <= 23),
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

-- ===== 8. daily_update_comments tablosu (yönetici yorumu) =====
CREATE TABLE IF NOT EXISTS public.daily_update_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES public.daily_updates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_update_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view_update_comments"
  ON public.daily_update_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_updates du
      JOIN public.workspace_members wm ON wm.workspace_id = du.workspace_id
      WHERE du.id = daily_update_comments.update_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_managers_can_comment_on_updates"
  ON public.daily_update_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.daily_updates du
      JOIN public.workspace_members wm ON wm.workspace_id = du.workspace_id
      WHERE du.id = update_id AND wm.user_id = auth.uid()
    )
  );
