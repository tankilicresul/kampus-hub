-- Migration: Add status column to subtasks table for 3-state tracking
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS status text DEFAULT 'todo';
