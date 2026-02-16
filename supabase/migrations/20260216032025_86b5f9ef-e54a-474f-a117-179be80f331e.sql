CREATE POLICY "Users can update own checkins" 
ON public.progress_checkins 
FOR UPDATE 
USING (auth.uid() = user_id);