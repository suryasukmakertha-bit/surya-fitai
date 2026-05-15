-- Restrict Realtime broadcast/presence channels: deny by default.
-- postgres_changes still works because it relies on source-table RLS,
-- not on realtime.messages policies. This blocks any authenticated
-- user from subscribing to arbitrary named broadcast / presence topics.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all realtime channel reads" ON realtime.messages;
DROP POLICY IF EXISTS "Deny all realtime channel writes" ON realtime.messages;

CREATE POLICY "Deny all realtime channel reads"
ON realtime.messages
FOR SELECT
TO authenticated, anon
USING (false);

CREATE POLICY "Deny all realtime channel writes"
ON realtime.messages
FOR INSERT
TO authenticated, anon
WITH CHECK (false);