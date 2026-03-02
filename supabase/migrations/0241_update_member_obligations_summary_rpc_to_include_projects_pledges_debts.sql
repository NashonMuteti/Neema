CREATE OR REPLACE FUNCTION public.get_member_obligations_summary(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_search_query text DEFAULT ''
)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  member_email text,
  total_owed numeric,
  total_paid numeric,
  total_due numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_projects AS (
    SELECT id, COALESCE(member_contribution_amount, 0)::numeric AS expected_per_member
    FROM public.projects
    WHERE status = 'Open'
  ),
  expected_contrib AS (
    SELECT COALESCE(SUM(expected_per_member), 0)::numeric AS expected_total
    FROM active_projects
  ),
  pledge_totals AS (
    SELECT
      pp.member_id,
      COALESCE(SUM(pp.amount), 0)::numeric AS pledged_total
    FROM public.project_pledges pp
    WHERE pp.due_date >= p_start_date
      AND pp.due_date <= p_end_date
    GROUP BY pp.member_id
  ),
  debt_totals AS (
    SELECT
      d.debtor_profile_id AS member_id,
      COALESCE(SUM(d.original_amount), 0)::numeric AS debt_total
    FROM public.debts d
    WHERE d.debtor_profile_id IS NOT NULL
      AND COALESCE(d.due_date, d.created_at) >= p_start_date
      AND COALESCE(d.due_date, d.created_at) <= p_end_date
    GROUP BY d.debtor_profile_id
  ),
  collection_paid AS (
    SELECT
      pc.member_id,
      COALESCE(SUM(pc.amount), 0)::numeric AS paid_total
    FROM public.project_collections pc
    WHERE pc.date >= p_start_date
      AND pc.date <= p_end_date
    GROUP BY pc.member_id
  ),
  pledge_paid AS (
    SELECT
      it.profile_id AS member_id,
      COALESCE(SUM(it.amount), 0)::numeric AS paid_total
    FROM public.income_transactions it
    WHERE it.date >= p_start_date
      AND it.date <= p_end_date
      AND it.pledge_id IS NOT NULL
    GROUP BY it.profile_id
  ),
  debt_paid AS (
    SELECT
      it.profile_id AS member_id,
      COALESCE(SUM(it.amount), 0)::numeric AS paid_total
    FROM public.income_transactions it
    WHERE it.date >= p_start_date
      AND it.date <= p_end_date
      AND it.pledge_id IS NULL
      AND it.source ILIKE 'Debt Payment%'
    GROUP BY it.profile_id
  )
  SELECT
    prof.id AS member_id,
    COALESCE(prof.name, prof.email, 'Unknown Member') AS member_name,
    COALESCE(prof.email, '') AS member_email,
    (
      (SELECT expected_total FROM expected_contrib)
      + COALESCE(pt.pledged_total, 0)
      + COALESCE(dt.debt_total, 0)
    ) AS total_owed,
    (
      COALESCE(cp.paid_total, 0)
      + COALESCE(ppaid.paid_total, 0)
      + COALESCE(dpaid.paid_total, 0)
    ) AS total_paid,
    GREATEST(
      (
        (SELECT expected_total FROM expected_contrib)
        + COALESCE(pt.pledged_total, 0)
        + COALESCE(dt.debt_total, 0)
      )
      -
      (
        COALESCE(cp.paid_total, 0)
        + COALESCE(ppaid.paid_total, 0)
        + COALESCE(dpaid.paid_total, 0)
      ),
      0
    ) AS total_due
  FROM public.profiles prof
  LEFT JOIN pledge_totals pt ON pt.member_id = prof.id
  LEFT JOIN debt_totals dt ON dt.member_id = prof.id
  LEFT JOIN collection_paid cp ON cp.member_id = prof.id
  LEFT JOIN pledge_paid ppaid ON ppaid.member_id = prof.id
  LEFT JOIN debt_paid dpaid ON dpaid.member_id = prof.id
  WHERE
    (public.is_admin_or_super_admin() OR prof.id = auth.uid())
    AND (
      COALESCE(p_search_query, '') = ''
      OR COALESCE(prof.name, '') ILIKE ('%' || p_search_query || '%')
      OR COALESCE(prof.email, '') ILIKE ('%' || p_search_query || '%')
    )
  ORDER BY total_due DESC, member_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_obligations_summary(timestamptz, timestamptz, text) TO authenticated;
