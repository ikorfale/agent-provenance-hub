# Supabase Database Setup

## Quick Setup (2 minutes)

1. Go to: https://ndzycnskjnwwajffmcbn.supabase.co/project/ndzycnskjnwwajffmcbn/sql/new

2. Paste the contents of `setup-database.sql`

3. Click "Run"

4. Done! Tables created.

## Manual SQL (if you prefer)

```sql
-- Copy entire setup-database.sql file content here
```

## Verify Setup

After running, check:
- Table Explorer → Should see: agents, skills, agent_capabilities, api_keys
- Row count should be 0 (empty tables ready for data)

## Test Query

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
```

Should return: agents, skills, agent_capabilities, api_keys

