UPDATE public.project_collections pc
SET receiving_account_id = it.account_id
FROM public.income_transactions it,
     public.projects p
WHERE pc.receiving_account_id IS NULL
  AND p.id = pc.project_id
  AND it.profile_id = pc.member_id
  AND it.amount = pc.amount
  AND it.date = pc.date
  AND it.source ILIKE ('Project Collection:%' || p.name || '%');