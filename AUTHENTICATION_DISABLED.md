# Authentication Disabled

Authentication has been temporarily disabled to allow you to focus on building features.

## What Was Changed

### 1. Root Layout (`app/_layout.tsx`)
- ✅ Removed all authentication checks
- ✅ Removed navigation guards
- ✅ Removed loading states
- ✅ App now loads directly without auth checks

### 2. Index Page (`app/index.tsx`)
- ✅ Removed auth-based redirects
- ✅ Now redirects directly to `/(tabs)` (dashboard)

### 3. Auth Hook (`app/hooks/useAuth.ts`)
- ✅ Replaced with a mock implementation
- ✅ Always returns authenticated state
- ✅ Provides a mock token: `'mock-token-for-development'`
- ✅ Provides mock user data
- ✅ All API calls will continue to work (they'll use the mock token)

### 4. Backup Created
- ✅ Original auth hook backed up to `app/hooks/useAuth.BACKUP.ts`

## Current Behavior

- **No login required** - App opens directly to the dashboard
- **All features accessible** - No route protection
- **API calls work** - Mock token is provided to all components
- **No auth errors** - All auth-dependent code continues to function

## How to Re-enable Authentication Later

When you're ready to re-enable authentication:

1. **Restore the auth hook:**
   ```bash
   mv app/hooks/useAuth.BACKUP.ts app/hooks/useAuth.ts
   ```

2. **Restore the root layout:**
   - Add back the auth checks and navigation guards
   - Refer to `AUTH_IMPLEMENTATION.md` for the full implementation

3. **Restore the index page:**
   - Add back auth-based redirects

4. **Test the login flow:**
   - Make sure login/logout works correctly
   - Verify route protection is working

## Files That Still Use useAuth

These files will continue to work with the mock implementation:
- `app/health-tracker/[vaccinationId].tsx`
- `app/aiSupport/index.tsx`
- `app/profile/index.tsx`
- `app/(auth)/login.tsx`
- `app/aiSupport/SavedResponses.tsx`
- `app/journal/[entryId].tsx`
- `app/health-tracker/VaccinationTabNew.tsx`
- `app/journal/index.tsx`

All these files will receive the mock token and continue to function normally.

## Notes

- The login page (`app/(auth)/login.tsx`) is still accessible but doesn't do anything
- The logout button will log a warning but won't actually log you out
- All API calls will use the mock token `'mock-token-for-development'`
- You may need to update your API to accept this mock token, or remove token validation temporarily

## Development Tips

While auth is disabled, you can:
- ✅ Build and test all features without login
- ✅ Focus on UI/UX improvements
- ✅ Test API integrations (with mock token)
- ✅ Develop new features quickly

When you're ready to work on authentication again, simply restore the backup files and refer to the implementation documentation.
