// ⚠️ AUTHENTICATION DISABLED - This is a mock implementation
// To re-enable authentication, restore the useAuth.BACKUP.ts file

interface UserProfile {
  ID: string
  FullName: string
  FirstName: string
  LastName: string | null
  Email: Array<{ Type: string; Value: string }>
  ImageUrl: string | null
  ThumbnailImageUrl: string | null
  Company: string | null
  LocalCity: string | null
  LocalCountry: string | null
  CreatedDate: string
  LastLoginDate: string
}

export const useAuth = () => {
  // Mock user data
  const mockUser: UserProfile = {
    ID: 'mock-user-id',
    FullName: 'Test User',
    FirstName: 'Test',
    LastName: 'User',
    Email: [{ Type: 'Primary', Value: 'test@example.com' }],
    ImageUrl: null,
    ThumbnailImageUrl: null,
    Company: 'Test Company',
    LocalCity: 'Test City',
    LocalCountry: 'Test Country',
    CreatedDate: new Date().toISOString(),
    LastLoginDate: new Date().toISOString(),
  };

  // Return mock authenticated state
  return {
    isAuthenticated: true,
    token: 'mock-token-for-development',
    user: mockUser,
    loading: false,
    login: async () => {
      console.log('⚠️ Auth is disabled - login() called but does nothing');
    },
    loginWithResponse: async () => {
      console.log('⚠️ Auth is disabled - loginWithResponse() called but does nothing');
    },
    logout: async () => {
      console.log('⚠️ Auth is disabled - logout() called but does nothing');
    },
    version: 0,
    checkTokenValidity: async () => {
      console.log('⚠️ Auth is disabled - checkTokenValidity() called but does nothing');
    },
  };
};

// Also export as default for compatibility
export default useAuth;
