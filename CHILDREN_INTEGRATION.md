# Children IDs Integration

## Overview
The app now supports multiple children per parent through the `childrenIds` array in the user object.

## Changes Made

### 1. AuthContext Updates (`context/AuthContext.tsx`)
- Added `selectedChildId` state to track the currently active child
- Added `setSelectedChildId` function to switch between children
- Auto-selects the first child from `childrenIds` array on login/signup
- Maintains backward compatibility with old `childId` field

### 2. Home Screen (`app/home/index.tsx`)
- Updated to use `selectedChildId` instead of `user.childId`
- Fetches baby profile based on selected child
- All measurement operations now use the selected child

### 3. Baby Growth Tab (`app/health-tracker/BabyGrowthTab.tsx`)
- Updated to use `selectedChildId` instead of `user.childId`
- Fetches and displays data for the currently selected child
- All growth tracking operations now use the selected child

### 4. Profile Screen (`app/profile/index.tsx`)
- Added "My Children" section that displays all children
- Shows child name, gender, and birthday
- Allows switching between children by tapping on them
- Highlights the currently active child with "Active" badge
- Fetches full child data for all children in `childrenIds` array

## User Flow

1. **Login/Signup**: First child from `childrenIds` array is automatically selected
2. **View Profile**: See all children listed in the "My Children" section
3. **Switch Child**: Tap on any child in the profile to make them active
4. **View Data**: Home screen and health tracker show data for the currently selected child

## Data Structure

### User Object
```json
{
  "id": "user-id",
  "name": "Parent Name",
  "email": "email@example.com",
  "childrenIds": ["child-id-1", "child-id-2"],
  "childId": "child-id-1"  // Deprecated, kept for backward compatibility
}
```

### Child Object
```json
{
  "id": "child-id",
  "parentId": "user-id",
  "name": "Child Name",
  "gender": "Male",
  "birthday": "2024-01-01T00:00:00.000Z",
  "height": [...],
  "weight": [...]
}
```

## Backward Compatibility

The implementation maintains backward compatibility:
- If `childrenIds` array exists, it takes priority
- If only `childId` exists (old format), it's used as fallback
- Existing users with `childId` will continue to work

## Future Enhancements

- Add child selector dropdown in home screen header
- Add ability to add new children from profile screen
- Add ability to edit/delete children
- Show child avatar/photo in profile
- Add child-specific settings
