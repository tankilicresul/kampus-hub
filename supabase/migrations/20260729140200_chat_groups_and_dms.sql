-- Migration: Create chat groups and direct messages (DMs) tables and update message security
-- Target: Supabase DB Local Setup

-- 1. Create chat_rooms table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_dm BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create chat_room_members table
CREATE TABLE IF NOT EXISTS public.chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('invited', 'joined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for chat_rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view chat rooms they are members of" ON public.chat_rooms;
CREATE POLICY "Users can view chat rooms they are members of" ON public.chat_rooms
  FOR SELECT USING (
    id IN (SELECT room_id FROM public.chat_room_members WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can create chat rooms in their workspace" ON public.chat_rooms;
CREATE POLICY "Users can create chat rooms in their workspace" ON public.chat_rooms
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- Enable RLS for chat_room_members
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of chat rooms they belong to" ON public.chat_room_members;
CREATE POLICY "Users can view members of chat rooms they belong to" ON public.chat_room_members
  FOR SELECT USING (
    room_id IN (SELECT room_id FROM public.chat_room_members WHERE user_id = auth.uid())
    OR room_id IN (SELECT id FROM public.chat_rooms WHERE created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert members for chat rooms they created or joined" ON public.chat_room_members;
CREATE POLICY "Users can insert members for chat rooms they created or joined" ON public.chat_room_members
  FOR INSERT WITH CHECK (
    room_id IN (SELECT id FROM public.chat_rooms WHERE created_by = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own status or rooms they own" ON public.chat_room_members;
CREATE POLICY "Users can update their own status or rooms they own" ON public.chat_room_members
  FOR UPDATE USING (
    user_id = auth.uid()
    OR room_id IN (SELECT id FROM public.chat_rooms WHERE created_by = auth.uid())
  );

-- Add unique index to avoid duplicate membership
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_room_members_room_user ON public.chat_room_members(room_id, user_id);

-- 3. Add room_id to workspace_messages
ALTER TABLE public.workspace_messages ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE;

-- 4. Update workspace_messages select policy
DROP POLICY IF EXISTS msg_select ON public.workspace_messages;
CREATE POLICY msg_select ON public.workspace_messages
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_messages.workspace_id 
        AND wm.user_id = auth.uid()
    )
    AND (
      room_id IS NULL
      OR EXISTS (
        SELECT 1 FROM chat_room_members crm
        WHERE crm.room_id = workspace_messages.room_id
          AND crm.user_id = auth.uid()
          AND crm.status = 'joined'
      )
    )
  );

-- 5. Update workspace_messages insert policy
DROP POLICY IF EXISTS msg_insert ON public.workspace_messages;
CREATE POLICY msg_insert ON public.workspace_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_messages.workspace_id 
        AND wm.user_id = auth.uid()
    )
    AND (
      room_id IS NULL
      OR EXISTS (
        SELECT 1 FROM chat_room_members crm
        WHERE crm.room_id = workspace_messages.room_id
          AND crm.user_id = auth.uid()
          AND crm.status = 'joined'
      )
    )
  );
