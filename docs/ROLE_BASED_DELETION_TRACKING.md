# Enhanced Deletion Tracking with Role Information

## Overview
This enhancement adds the ability to track not only **which user** deleted a request, but also **what role** they had when they performed the deletion. This provides better audit trails and role-based deletion analytics.

## What Was Already Working
✅ **User ID Tracking**: The system already stored the `deletedBy` user ID in the `requestbackup` table  
✅ **Soft Delete**: Requests were moved to backup instead of permanent deletion  
✅ **Audit Trail**: Basic deletion tracking was in place  

## What Was Added

### 1. Database Schema Enhancement
- **New Column**: Added `deletedByRole VARCHAR(50)` to the `requestbackup` table
- **Migration File**: `20250831_add_deleted_by_role_column.sql`
- **Index**: Added performance index for role-based filtering
- **Model Update**: Updated `RequestBackup.js` to include the new field

### 2. Backend API Enhancement
- **Controller Update**: Modified `deleteRequest()` in `requestController.js` to:
  - Accept `userRole` parameter from frontend
  - Store the role in `deletedByRole` column
  - Fallback to database lookup if role not provided
  - Enhanced logging with role information
- **Filtering Support**: Added role-based filtering to `getDeletedRequests()` API

### 3. Frontend Dashboard Updates
Updated all role dashboards to send user role information:
- `UserDashboard.tsx` - sends `userRole: "user"`
- `SupervisorDashboard.tsx` - sends `userRole: "supervisor"`
- `TechnicalManagerDashboard.tsx` - sends `userRole: "technical-manager"`
- `EngineerDashboard.tsx` - sends `userRole: "engineer"`
- `CustomerOfficerDashboard.tsx` - sends `userRole: "customer-officer"`

### 4. Deleted Requests Table Enhancement
Enhanced `DeletedRequestsTable.tsx` component:
- **New Interface**: Added `deletedByRole` to `DeletedRequest` interface
- **Role Filter**: Added dropdown filter for filtering by role
- **Role Display**: Added visual role badges with color coding:
  - User: Blue badge
  - Supervisor: Green badge
  - Technical Manager: Purple badge
  - Engineer: Orange badge
  - Customer Officer: Red badge
- **Table Column**: Added "Role" column to display the deletion role

## How It Works

### Deletion Process
1. User clicks delete button in any dashboard
2. Frontend sends both `userId` and `userRole` to backend
3. Backend stores both pieces of information in `requestbackup` table
4. If role is missing, backend attempts to lookup from users table

### Viewing Deleted Requests
1. Users can access "Deleted Requests" page from any dashboard
2. Enhanced filtering allows filtering by:
   - Vehicle number, status, requester name (existing)
   - **NEW**: Deleted by role (user, supervisor, technical-manager, engineer, customer-officer)
   - Date range (existing)
3. Table displays role information with color-coded badges
4. Full audit trail shows who deleted what and their role

## Example Usage Scenarios

### Scenario 1: Supervisor Deletion Audit
- Filter by "Deleted By Role" = "Supervisor" 
- See all requests deleted by supervisors
- Identify deletion patterns by supervisor role

### Scenario 2: Role-Based Analytics
- Track which roles delete the most requests
- Identify if certain roles need additional training
- Monitor deletion patterns across different user types

### Scenario 3: Compliance Reporting
- Generate reports showing deletion activities by role
- Audit trail for compliance requirements
- Track role-based access and deletion privileges

## Database Migration Required

To deploy this enhancement, run the following SQL on your database:

```sql
-- Add the new column
ALTER TABLE requestbackup 
ADD COLUMN deletedByRole VARCHAR(50) NULL 
AFTER deletedBy;

-- Add index for performance
CREATE INDEX idx_deleted_by_role ON requestbackup (deletedByRole);
```

## Benefits

1. **Enhanced Audit Trail**: Know not just who deleted, but their role/authority level
2. **Better Analytics**: Role-based deletion patterns and statistics
3. **Compliance**: Improved audit capabilities for regulatory requirements
4. **User Training**: Identify roles that may need additional deletion guidelines
5. **Security**: Track unauthorized deletions by role level
6. **Backward Compatibility**: Existing deletion records remain functional (role will be NULL)

## Technical Details

### API Changes
- `DELETE /api/requests/:id` now accepts optional `userRole` parameter
- `GET /api/requests/deleted` now supports `deletedByRole` filter parameter

### Frontend Changes
- All dashboard delete calls now send role information
- Enhanced filtering and display in deleted requests table
- Color-coded role badges for visual identification

### Database Changes
- New `deletedByRole` column with index
- Graceful handling of NULL values for existing records

This enhancement provides comprehensive role-based deletion tracking while maintaining full backward compatibility with existing functionality.