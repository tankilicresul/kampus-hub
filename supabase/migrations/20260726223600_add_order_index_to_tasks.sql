-- Add order_index column to tasks table for drag and drop custom sorting
ALTER TABLE public.tasks ADD COLUMN order_index DOUBLE PRECISION DEFAULT 0.0 NOT NULL;

-- Initialize order_index for existing tasks based on their creation date
WITH ordered_tasks AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY workspace_id, status ORDER BY created_at ASC) as row_num
  FROM public.tasks
)
UPDATE public.tasks t
SET order_index = ot.row_num::DOUBLE PRECISION
FROM ordered_tasks ot
WHERE t.id = ot.id;
