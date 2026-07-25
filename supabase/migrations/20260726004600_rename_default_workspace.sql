-- Migration: Rename default workspace to TanCoreLab
-- Date: 2026-07-26

UPDATE public.workspaces
SET name = 'TanCoreLab', slug = 'tancorelab'
WHERE id = 'df39e73b-bf72-4d1a-9694-82bd8996b797';
