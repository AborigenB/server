const axios = require('axios');

async function testNavidrome() {
  const baseUrl = 'http://localhost:4533';
  const params = {
    u: 'shamil',
    p: 'admin', 
    v: '1.16.1',
    c: 'test',
    f: 'json'
  };

  try {
    console.log('🔍 Testing Navidrome connection...');
    
    // Тест 1: Ping endpoint
    const pingResponse = await axios.get(`${baseUrl}/rest/ping`, { params, timeout: 5000 });
    console.log('✅ Ping successful:', pingResponse.data['subsonic-response'].status);
    
    // Тест 2: Get license info
    const licenseResponse = await axios.get(`${baseUrl}/rest/getLicense`, { params, timeout: 5000 });
    console.log('✅ License check successful');
    
    // Тест 3: Get some songs
    const songsResponse = await axios.get(`${baseUrl}/rest/getSong`, { 
      params: { ...params, type: 'random', size: 5 },
      timeout: 5000 
    });
    console.log('✅ Songs fetch successful');
    console.log(songsResponse)
  } catch (error) {
    console.error('❌ Navidrome test failed:');
    console.error('   Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   💡 Navidrome is not running or port is wrong');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testNavidrome();