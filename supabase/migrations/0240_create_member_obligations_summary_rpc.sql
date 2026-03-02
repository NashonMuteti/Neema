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
  WITH pledge_totals AS (
    SELECT
      pp.member_id,
      SUM(pp.amount) AS total_owed,
      SUM(COALESCE(pp.paid_amount, 0)) AS total_paid,
      SUM(GREATEST(pp.amount - COALESCE(pp.paid_amount, 0), 0)) AS total_due
    FROM public.project_pledges pp
    WHERE pp.due_date >= p_start_date
      AND pp.due_date <= p_end_date
    GROUP BY pp.member_id
  )
  SELECT
    prof.id AS member_id,
    COALESCE(prof.name, prof.email, 'Unknown Member') AS member_name,
    COALESCE(prof.email, '') AS member_email,
    COALESCE(pt.total_owed, 0) AS total_owed,
    COALESCE(pt.total_paid, 0) AS total_paid,
    COALESCE(pt.total_due, 0) AS total_due
  FROM public.profiles prof
  LEFT JOIN pledge_totals pt
    ON pt.member_id = prof.id
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
