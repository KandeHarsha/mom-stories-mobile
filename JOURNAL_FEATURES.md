# Journal Entry Editing and Deletion

## Overview
Added functionality to edit and delete journal entries through a dedicated route at `/journal/[entryId]`.

## Features

### Edit Journal Entries
- Navigate to any journal entry by tapping on it from the private journal list
- Edit title and content of existing entries
- View creation date and media attachment information
- Save changes with validation

### Delete Journal Entries
- Delete entries with confirmation dialog
- Permanent deletion with warning message
- Automatic navigation back to journal list after deletion

### User Experience Improvements
- Visual indicators showing entries are tappable (chevron arrow)
- Loading states for all operations
- Error handling with user-friendly messages
- Automatic refresh of journal list when returning from edit screen
- Media attachment indicators (photo/audio icons)

## Technical Implementation

### Route Structure
- **File**: `app/journal/[entryId].tsx`
- **Route**: `/journal/{entryId}`
- **Methods**: GET, PUT, DELETE

### API Endpoints Used
- `GET /journal` - Fetch all entries (used to populate the list and pass data to edit screen)
- `PUT /journal/{entryId}` - Update entry (title and content only)
- `DELETE /journal/{entryId}` - Delete entry

### Data Flow
- Entry data is passed through navigation parameters from the journal list
- No separate GET endpoint needed for individual entries
- Edit screen works with the data already loaded from the main journal list

### Current Limitations
- Image and audio editing is not supported yet
- Only title and content can be modified
- Media attachments are preserved but cannot be changed

### Navigation Flow
1. Private Journal List → Tap Entry → Edit Screen
2. Edit Screen → Save → Back to List (with refresh)
3. Edit Screen → Delete → Confirmation → Back to List

## Usage
1. Open the Private Journal tab
2. Tap on any existing journal entry
3. Edit the title and/or content
4. Tap "Save Changes" to update or use the trash icon to delete
5. Confirm deletion if prompted

## Future Enhancements
- Media editing capabilities
- Bulk operations
- Entry duplication
- Advanced search and filtering