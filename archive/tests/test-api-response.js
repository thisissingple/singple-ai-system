// 測試 API 回應是否包含 invalidRecords
const fetch = require('node-fetch');

async function testAPI() {
  try {
    const response = await fetch('http://localhost:5001/api/worksheets/7348bffd-5253-42b4-9826-e90a6acd1d1a/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    console.log('=== API Response Check ===');
    console.log('Status:', response.status);
    console.log('success:', data.success);
    console.log('data exists:', !!data.data);
    console.log('syncStats exists:', !!data.syncStats);

    if (data.syncStats) {
      console.log('\n=== Sync Stats ===');
      console.log('totalRows:', data.syncStats.totalRows);
      console.log('insertedToSupabase:', data.syncStats.insertedToSupabase);
      console.log('invalidRows:', data.syncStats.invalidRows);
      console.log('invalidRecords exists:', !!data.syncStats.invalidRecords);
      console.log('invalidRecords length:', data.syncStats.invalidRecords?.length);

      if (data.syncStats.invalidRecords && data.syncStats.invalidRecords.length > 0) {
        console.log('\n=== Invalid Records ===');
        console.log(JSON.stringify(data.syncStats.invalidRecords, null, 2));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
