-- Phase 6 Step 6.3 / App Flow 3.7-3.8: customers subscribe to their own
-- order's status changes via Supabase Realtime. The orders table was never
-- added to the realtime publication, so no changes were being broadcast.
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
