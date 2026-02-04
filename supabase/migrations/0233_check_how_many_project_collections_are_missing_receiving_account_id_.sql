select
  count(*) as total,
  count(*) filter (where receiving_account_id is null) as missing_receiving_account_id
from public.project_collections;