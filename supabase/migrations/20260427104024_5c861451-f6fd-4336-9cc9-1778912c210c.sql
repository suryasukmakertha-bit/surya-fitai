-- Create user_feedback table
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER,
  user_email TEXT,
  plan_goal TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  CONSTRAINT message_length CHECK (char_length(message) > 0 AND char_length(message) <= 500)
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
ON public.user_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.user_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role full access (for admin queries via edge function)
CREATE POLICY "Service role full access feedback"
ON public.user_feedback
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Index for sorting
CREATE INDEX idx_user_feedback_created_at ON public.user_feedback(created_at DESC);