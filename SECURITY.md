# Supabase Security Guidelines

This document outlines the security best practices for our Supabase implementation.

## 1. Client Configuration Security

### Environment Variables
- All Supabase configuration is stored in environment variables
- Only the publishable (anon) key is exposed client-side
- The service key should only be used in server-side functions

### Secure Client Initialization
The Supabase client is initialized with security-focused settings:
- Auto token refresh enabled
- Session persistence configured
- Proper error handling

## 2. Row Level Security (RLS) Requirements

### Mandatory RLS Implementation
Every table in the public schema MUST have RLS enabled with appropriate policies.

### RLS Policy Templates

#### User Profile Access
```sql
-- Users can only view their own profile
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);
```

#### Project Data Access
```sql
-- Users can only view their own projects
CREATE POLICY "Users can view their own projects" 
ON projects FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only create their own projects
CREATE POLICY "Users can create their own projects" 
ON projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

## 3. Data Access Patterns

### Always Use Supabase Client
Never access database directly from client-side code. Always use the configured Supabase client.

### Implement Proper Error Handling
```javascript
const { data, error } = await supabase
  .from('table')
  .select('*');

if (error) {
  // Log error securely (no sensitive data)
  console.error('Data fetch failed');
  // Show user-friendly message
  showError('Unable to load data');
  return;
}
```

## 4. Authentication Security

### Session Management
- Sessions are automatically refreshed
- Session data is persisted securely
- Users are redirected on auth state changes

### Role-Based Access Control
- User roles are defined in the `roles` table
- Menu privileges are checked before rendering UI elements
- Admin actions require specific role permissions

## 5. Regular Security Audits

### Automated Checks
- Verify RLS is enabled on all tables
- Check for overly permissive policies
- Validate authentication flows

### Manual Reviews
- Review all database policies quarterly
- Audit user role permissions
- Check for unused or orphaned accounts

## 6. Incident Response

If a security issue is discovered:
1. Immediately rotate affected keys
2. Review and tighten relevant policies
3. Audit recent access logs
4. Notify affected users if necessary