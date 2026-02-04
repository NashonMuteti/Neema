select id, project_id, member_id, amount, date, receiving_account_id
from public.project_collections
order by date desc
limit 10;