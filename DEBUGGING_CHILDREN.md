# Debugging Children Integration

## Issue: Not seeing children data in Baby Growth Tab

### Steps to Debug

1. **Check Console Logs**
   - Open your app and check the console/terminal for these logs:
   ```
   AuthContext: User data: {...}
   AuthContext: childrenIds: [...]
   AuthContext: selectedChildId: ...
   BabyGrowthTab: selectedChildId: ...
   Home: selectedChildId: ...
   ```

2. **Verify User Data Structure**
   - Your user object should have `childrenIds` array:
   ```json
   {
     "id": "6976541d57e9a63cb275d319",
     "name": "Harsha",
     "email": "kv05@yopmail.com",
     "childrenIds": ["208nL2EHHjBVa5F9ONnn"]
   }
   ```

3. **Check if selectedChildId is Set**
   - After login, `selectedChildId` should be automatically set to the first child ID
   - Check console logs: `AuthContext: Setting selectedChildId from childrenIds: 208nL2EHHjBVa5F9ONnn`

4. **Verify Child Profile Exists**
   - Make sure the child profile with ID `208nL2EHHjBVa5F9ONnn` exists in your database
   - The API endpoint `GET /children/208nL2EHHjBVa5F9ONnn` should return valid data

### Common Issues

#### Issue 1: selectedChildId is null
**Symptoms:** Console shows `selectedChildId: null`

**Solutions:**
- Check if user data has `childrenIds` array
- Verify the array is not empty
- Try logging out and logging back in
- Check if the user data is being fetched correctly

#### Issue 2: Child profile not found
**Symptoms:** API returns 404 or error when fetching child data

**Solutions:**
- Verify the child ID exists in your database
- Check if the child's `parentId` matches your user ID
- Ensure the API endpoint is correct

#### Issue 3: User data doesn't have childrenIds
**Symptoms:** Console shows `childrenIds: undefined`

**Solutions:**
- Your backend needs to return `childrenIds` array in the user object
- Update your backend to include this field
- Or create a new child profile (it will automatically add to childrenIds)

### Testing Steps

1. **Fresh Login Test**
   ```
   1. Logout completely
   2. Login again
   3. Check console for: "AuthContext: Setting selectedChildId from childrenIds: ..."
   4. Navigate to Health Tracker > Baby Growth
   5. Should see child data, not "Create Profile" screen
   ```

2. **Create New Child Test**
   ```
   1. If you see "Create Profile" screen, create a new child
   2. After creation, check console for: "RefreshUser: Updated user data: ..."
   3. Child should appear immediately
   4. Navigate away and back - child data should persist
   ```

3. **Profile Screen Test**
   ```
   1. Go to Profile tab
   2. Should see "My Children" section
   3. Should list all children from childrenIds array
   4. Tap on a child to switch
   5. Go back to Home/Health Tracker - should show selected child's data
   ```

### Manual Fix

If automatic selection doesn't work, you can manually set the child ID:

1. Go to Profile screen
2. In "My Children" section, tap on your child
3. This will manually set `selectedChildId`
4. Navigate to Health Tracker - should now show child data

### Backend Requirements

Your backend must:
1. Return `childrenIds` array in user object from `/user` endpoint
2. Update `childrenIds` when a new child is created via `POST /children`
3. Return child data from `GET /children/:childId` endpoint

Example user response:
```json
{
  "id": "user-id",
  "name": "Parent Name",
  "email": "email@example.com",
  "childrenIds": ["child-id-1", "child-id-2"]
}
```
