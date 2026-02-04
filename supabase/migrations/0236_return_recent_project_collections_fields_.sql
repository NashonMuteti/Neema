select id::text, date, amount, receiving_account_id::text
from public.project_collections
order by date desc
limit 5;