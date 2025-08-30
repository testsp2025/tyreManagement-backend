# Tire Request Soft Delete Implementation

## Overview
This implementation replaces hard deletion of tire requests with a soft delete mechanism. When a user deletes a tire request from the dashboard, the request is moved to a backup table (`requestbackup`) instead of being permanently removed.

## Features
1. **Soft Delete**: Requests are moved to backup table instead of permanent deletion
2. **Data Preservation**: All request data and associated images are preserved
3. **Audit Trail**: Tracks who deleted the request and when
4. **Restore Capability**: Deleted requests can be restored if needed
5. **Image Backup**: Associated images are also backed up and can be restored

## Database Changes

### New Tables
- `requestbackup`: Stores deleted requests with deletion metadata
- `request_images_backup`: Stores images associated with deleted requests

### Migration File
- `20250830_create_request_backup_table.sql`: Creates the backup table structure

## API Endpoints

### 1. Delete Request (Soft Delete)
**Endpoint:** `DELETE /api/requests/:id`

**Request Body:**
```json
{
  "userId": 123  // Optional: ID of user performing deletion
}
```

**Response:**
```json
{
  "message": "Request deleted successfully and moved to backup",
  "deletedRequestId": 123,
  "backupCreated": true,
  "imagesBackedUp": 2
}
```

### 2. Get Deleted Requests
**Endpoint:** `GET /api/requests/deleted`

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of requests per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "vehicleNumber": "ABC123",
      // ... other request fields
      "deletedAt": "2025-08-30T10:30:00.000Z",
      "deletedBy": 999,
      "deletedByName": "John Admin",
      "images": ["/uploads/image1.jpg", "/uploads/image2.jpg"],
      "isDeleted": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### 3. Restore Deleted Request
**Endpoint:** `POST /api/requests/restore/:id`

**Request Body:**
```json
{
  "userId": 456  // Optional: ID of user performing restoration
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request restored successfully",
  "restoredRequestId": 123,
  "imagesRestored": 2
}
```

## Process Flow

### Deletion Process
1. Find the request in the main `requests` table
2. Create backup entry in `requestbackup` table with deletion metadata
3. Backup associated images to `request_images_backup` table
4. Delete original request and images
5. All operations are wrapped in a database transaction

### Restoration Process
1. Find the request in the `requestbackup` table
2. Check if request ID conflicts with existing requests
3. Restore request to main `requests` table
4. Restore associated images to `request_images` table
5. Remove backup entries
6. All operations are wrapped in a database transaction

## Benefits

1. **Data Safety**: No accidental permanent data loss
2. **Audit Compliance**: Full audit trail of deletions
3. **Recovery**: Ability to recover accidentally deleted requests
4. **Analytics**: Historical data preserved for analysis
5. **User Experience**: Users can safely delete without fear of permanent loss

## Implementation Details

### Models
- `RequestBackup.js`: Sequelize model for the backup table
- Updated `index.js`: Added RequestBackup to exports

### Controllers
- Modified `deleteRequest()`: Implements soft delete logic
- Added `getDeletedRequests()`: Retrieves deleted requests
- Added `restoreDeletedRequest()`: Restores deleted requests

### Routes
- Updated `requestRoutes.js`: Added new backup-related endpoints

## Error Handling

All operations include comprehensive error handling:
- Database transaction rollback on errors
- Detailed error logging
- User-friendly error messages
- Connection cleanup in finally blocks

## Testing

Run the demonstration script:
```bash
node test/soft-delete-demo.js
```

This script shows how the soft delete process works with mock data.

## Future Enhancements

1. **Automatic Cleanup**: Scheduled job to permanently delete old backup records
2. **Bulk Operations**: Bulk restore/delete operations
3. **Search**: Search functionality for deleted requests
4. **Export**: Export deleted requests for archival
5. **Permissions**: Role-based access to backup operations

## Database Indexes

The backup table includes indexes for optimal performance:
- `idx_deleted_at`: For chronological queries
- `idx_original_id`: For ID-based lookups
- `idx_vehicle_number`: For vehicle-based searches

## Backward Compatibility

This implementation is fully backward compatible:
- Existing API endpoints continue to work
- No changes required to frontend delete functionality
- Additional endpoints are optional enhancements