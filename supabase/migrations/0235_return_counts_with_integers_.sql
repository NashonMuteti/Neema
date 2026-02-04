select
  count(*)::int as total,
  count(*) filter (where receiving_account_id is null)::int as missing_receiving_account_id
from public.project_collections;