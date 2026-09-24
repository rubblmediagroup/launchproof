alter table opportunities enable row level security;
create policy "organization members only" on opportunities using (organization_id = auth.jwt() ->> 'organization_id');
