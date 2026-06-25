-- Allow reporters to read back their own rows (needed after insert .select() and for client sync).
drop policy if exists "Users read own chat reports" on public.chat_reports;
create policy "Users read own chat reports" on public.chat_reports
  for select
  to authenticated
  using (reporter_uid = auth.uid()::text);
