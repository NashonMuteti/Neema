CREATE OR REPLACE FUNCTION public.get_member_contributions_summary(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_search_query text DEFAULT ''
)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  member_email text,
  total_contributed numeric,
  last_contribution_date timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH contribution_income AS (
    SELECT
      it.profile_id AS member_id,
      SUM(it.amount) AS total_contributed,
      MAX(it.date) AS last_contribution_date
    FROM public.income_transactions it
    WHERE it.date >= p_start_date
      AND it.date <= p_end_date
      AND (
        lower(it.source) LIKE '%project collection%'
        OR it.pledge_id IS NOT NULL
      )
    GROUP BY it.profile_id
  )
  SELECT
    prof.id AS member_id,
    COALESCE(prof.name, prof.email, 'Unknown Member') AS member_name,
    COALESCE(prof.email, '') AS member_email,
    COALESCE(ci.total_contributed, 0) AS total_contributed,
    ci.last_contribution_date
  FROM public.profiles prof
  LEFT JOIN contribution_income ci
    ON ci.member_id = prof.id
  WHERE
    -- Access control: admins can view all, non-admins only see their own row
    (public.is_admin_or_super_admin() OR prof.id = auth.uid())
    AND (
      COALESCE(p_search_query, '') = ''
      OR COALESCE(prof.name, '') ILIKE ('%' || p_search_query || '%')
      OR COALESCE(prof.email, '') ILIKE ('%' || p_search_query || '%')
    )
  ORDER BY total_contributed DESC, member_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_contributions_summary(timestamptz, timestamptz, text) TO authenticated;
