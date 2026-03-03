CREATE OR REPLACE FUNCTION public.get_member_obligations_summary_current(
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
    SELECT COALESCE(member_contribution_amount, 0)::numeric AS expected_per_member
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
      COALESCE(SUM(pp.amount), 0)::numeric AS pledged_total,
      COALESCE(SUM(COALESCE(pp.paid_amount, 0)), 0)::numeric AS pledged_paid_total
    FROM public.project_pledges pp
    GROUP BY pp.member_id
  ),
  debt_totals AS (
    SELECT
      d.debtor_profile_id AS member_id,
      COALESCE(SUM(d.original_amount), 0)::numeric AS debt_total,
      COALESCE(SUM(GREATEST(d.original_amount - d.amount_due, 0)), 0)::numeric AS debt_paid_total
    FROM public.debts d
    WHERE d.debtor_profile_id IS NOT NULL
    GROUP BY d.debtor_profile_id
  ),
  collection_paid AS (
    SELECT
      pc.member_id,
      COALESCE(SUM(pc.amount), 0)::numeric AS paid_total
    FROM public.project_collections pc
    GROUP BY pc.member_id
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
      + COALESCE(pt.pledged_paid_total, 0)
      + COALESCE(dt.debt_paid_total, 0)
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
        + COALESCE(pt.pledged_paid_total, 0)
        + COALESCE(dt.debt_paid_total, 0)
      ),
      0
    ) AS total_due
  FROM public.profiles prof
  LEFT JOIN pledge_totals pt ON pt.member_id = prof.id
  LEFT JOIN debt_totals dt ON dt.member_id = prof.id
  LEFT JOIN collection_paid cp ON cp.member_id = prof.id
  WHERE
    prof.status = 'Active'
    AND (public.is_admin_or_super_admin() OR prof.id = auth.uid())
    AND (
      COALESCE(p_search_query, '') = ''
      OR COALESCE(prof.name, '') ILIKE ('%' || p_search_query || '%')
      OR COALESCE(prof.email, '') ILIKE ('%' || p_search_query || '%')
    )
  ORDER BY total_due DESC, member_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_obligations_summary_current(text) TO authenticated;
