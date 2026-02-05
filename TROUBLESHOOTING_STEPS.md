# Troubleshooting: Children Not Showing in Baby Growth Tab

## Quick Fix Steps

### Step 1: Check Your Profile Screen
1. Open the app and go to **Profile** tab
2. Look for the **Debug Info** section (gray box)
3. Check what it shows:
   - `childrenIds: ["208nL2EHHjBVa5F9ONnn"]` ✅ Good
   - `childrenIds: none` ❌ Problem
   - `selectedChildId: "208nL2EHHjBVa5F9ONnn"` ✅ Good
   - `selectedChildId: none` ❌ Problem

### Step 2: If childrenIds shows "none"
Your backend is not returning the `childrenIds` array. Two options:

**Option A: Update Backend**
- Modify your `/user` endpoint to return `childrenIds` array
- The array should contain all child IDs for this parent

**Option B: Create a New Child**
- Go to Health Tracker > Baby Growth tab
- Click "Create Child Profile"
- Fill in the details and create
- This should automatically add the child to your `childrenIds`

### Step 3: If childrenIds exists but selectedChildId is "none"
1. In Profile screen, tap the **"Refresh User Data"** button
2. Check if `selectedChildId` is now set
3. If still "none", go to "My Children" section and tap on your child
4. Navigate to Health Tracker - should now show child data

### Step 4: If both exist but still showing "Create Profile"
1. Check the console logs in your terminal/debugger
2. Look for errors like:
   - `Failed to fetch baby profile`
   - `404 Not Found`
   - `No child profile found`
3. This means the child ID exists in user data but the child profile doesn't exist in database

### Step 5: Verify Child Profile Exists
Make sure your backend has a child profile with ID `208nL2EHHjBVa5F9ONnn`:
- Check your database
- Verify the `parentId` matches your user ID
- Ensure the API endpoint `GET /children/208nL2EHHjBVa5F9ONnn` returns data

## What Changed

The app now:
1. Uses `childrenIds` array instead of single `childId`
2. Tracks which child is currently selected via `selectedChildId`
3. Auto-selects the first child on login
4. Allows switching between children in Profile screen
5. Shows all children in "My Children" section

## Console Logs to Watch

When you open the app, you should see:
```
AuthContext: User data: {...}
AuthContext: childrenIds: ["208nL2EHHjBVa5F9ONnn"]
AuthContext: Setting selectedChildId from childrenIds: 208nL2EHHjBVa5F9ONnn
Home: selectedChildId: 208nL2EHHjBVa5F9ONnn
BabyGrowthTab: selectedChildId: 208nL2EHHjBVa5F9ONnn
```

If you see `selectedChildId: null` or `childrenIds: undefined`, that's the problem.

## Testing

1. **Logout and Login Again**
   - This will re-fetch user data and auto-select first child
   
2. **Use Refresh Button**
   - In Profile screen, tap "Refresh User Data"
   - This manually re-fetches user data
   
3. **Check Profile Screen**
   - Should see "My Children" section with your child listed
   - Tap on child to manually select it

## Need More Help?

Share these details:
1. What does Debug Info show in Profile screen?
2. What console logs do you see?
3. Does "My Children" section appear in Profile?
4. Can you create a new child profile successfully?
