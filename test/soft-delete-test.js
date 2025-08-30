/**
 * Test Script for Soft Delete Functionality
 * This script helps debug and verify the soft delete implementation
 */

async function testSoftDelete() {
  const BASE_URL = 'https://tyre-management-backend-production.up.railway.app'; // Update with your Railway URL
  
  console.log('🧪 Testing Soft Delete Functionality...\n');
  
  try {
    // Test 1: Check backup table status
    console.log('📊 Test 1: Checking backup table status...');
    const backupResponse = await fetch(`${BASE_URL}/api/requests/test/backup-count`);
    const backupData = await backupResponse.json();
    console.log('Backup status:', backupData);
    
    // Test 2: Get all current requests
    console.log('\n📋 Test 2: Getting current requests...');
    const requestsResponse = await fetch(`${BASE_URL}/api/requests`);
    const requestsData = await requestsResponse.json();
    console.log(`Found ${requestsData.length} active requests`);
    
    if (requestsData.length > 0) {
      const testRequestId = requestsData[0].id;
      console.log(`\n🎯 Test request ID for deletion: ${testRequestId}`);
      
      // Test 3: Try to delete a request
      console.log('\n🗑️ Test 3: Attempting soft delete...');
      const deleteResponse = await fetch(`${BASE_URL}/api/requests/${testRequestId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 999 // Test user ID
        })
      });
      
      const deleteResult = await deleteResponse.json();
      console.log('Delete result:', deleteResult);
      
      if (deleteResponse.ok) {
        console.log('✅ Soft delete successful!');
        
        // Test 4: Check backup table again
        console.log('\n📊 Test 4: Checking backup table after deletion...');
        const backupResponse2 = await fetch(`${BASE_URL}/api/requests/test/backup-count`);
        const backupData2 = await backupResponse2.json();
        console.log('Updated backup status:', backupData2);
        
        // Test 5: Try to get deleted requests
        console.log('\n🗃️ Test 5: Getting deleted requests...');
        const deletedResponse = await fetch(`${BASE_URL}/api/requests/deleted`);
        const deletedData = await deletedResponse.json();
        console.log('Deleted requests:', deletedData);
        
      } else {
        console.error('❌ Soft delete failed:', deleteResult);
      }
    } else {
      console.log('⚠️ No requests available for testing');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run in browser console or Node.js environment
if (typeof window !== 'undefined') {
  // Browser environment
  testSoftDelete();
} else {
  // Node.js environment
  const fetch = require('node-fetch');
  testSoftDelete();
}

console.log(`
🔍 DEBUGGING CHECKLIST:

1. Check Railway logs for soft delete messages:
   - Look for "🗑️ DELETE REQUEST CALLED"
   - Look for "✅ Request moved to backup table successfully"
   - Look for "✅ Original request deleted"

2. Check database directly:
   - SELECT COUNT(*) FROM requests;
   - SELECT COUNT(*) FROM requestbackup;
   - SELECT * FROM requestbackup ORDER BY deletedAt DESC LIMIT 5;

3. Test the API endpoints:
   - GET /api/requests/test/backup-count
   - GET /api/requests/deleted
   - DELETE /api/requests/:id

4. Common Issues:
   - Transaction rollback due to constraint errors
   - Column mismatch between requests and requestbackup
   - Missing userId in delete request body
   - Route not being called (check network tab)
`);