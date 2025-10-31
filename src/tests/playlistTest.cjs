const axios = require('axios');

class PlaylistTester {
  constructor() {
    this.client = axios.create({
      baseURL: 'http://localhost:3001/api',
      timeout: 10000,
    }); 

    this.testUser = {
      email: 'test@example.com',
      password: 'password123'
    };
  }

  async authenticate() {
    try {
      console.log('🔐 Authenticating test user...');
      
      const response = await this.client.post('/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      });

      this.testUser.token = response.data.data.accessToken;
      this.testUser.id = response.data.data._id;
      // console.log(response)
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.testUser.token}`;
      
      console.log('✅ Authentication successful');
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async runAllTests() {
    try {
      await this.authenticate();
      
      console.log('\n🎵 Starting Playlist API Tests...\n');

      // 1. Создание плейлиста
      const playlist = await this.testCreatePlaylist();
      console.log(playlist)
      // 2. Получение плейлистов пользователя
      await this.testGetUserPlaylists();
      
      // 3. Получение конкретного плейлиста
      await this.testGetPlaylist(playlist._id);
      
      // 4. Добавление трека в плейлист
      await this.testAddTrackToPlaylist(playlist._id);
      
      // 5. Получение треков плейлиста
      await this.testGetPlaylistTracks(playlist._id);
      
      // 6. Лайк плейлиста
      await this.testToggleLike(playlist._id);
      
      // 7. Поиск плейлистов
      await this.testSearchPlaylists();
      
      // 8. Публичные плейлисты
      await this.testGetPublicPlaylists();
      
      // 9. Обновление плейлиста
      await this.testUpdatePlaylist(playlist._id);
      
      // 10. Удаление плейлиста
      await this.testDeletePlaylist(playlist._id);

      console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
      console.error('\n💥 Test failed:', error.response?.data || error.message);
    }
  }

  async testCreatePlaylist() {
    console.log('1. Testing playlist creation...');
    
    const playlistData = {
      name: 'My Test Rock Playlist',
      description: 'An awesome playlist for testing',
      isPublic: true,
      tags: ['rock', 'test', 'awesome']
    };

    const response = await this.client.post('/playlists', playlistData);
    
    console.log('✅ Playlist created:', response.data.data.name);
    return response.data.data;
  }

  async testGetUserPlaylists() {
    console.log('2. Testing get user playlists...');
    
    const response = await this.client.get('/playlists');
    
    console.log(`✅ Found ${response.data.data.length} playlists`);
    console.log('   Playlists:', response.data.data.map(p => p.name));
  }

  async testGetPlaylist(playlistId) {
    console.log('3. Testing get specific playlist...');
    
    const response = await this.client.get(`/playlists/${playlistId}`);
    
    console.log('✅ Playlist retrieved:', response.data.data.name);
    console.log('   Track count:', response.data.data.trackCount);
  }

  async testAddTrackToPlaylist(playlistId) {
    console.log('4. Testing add track to playlist...');
    
    // Сначала получим несколько треков из API музыки
    const tracksResponse = await this.client.get('/music/tracks?limit=3');
    const tracks = tracksResponse.data.data;
    
    if (tracks.length === 0) {
      console.log('⚠️ No tracks available, skipping track addition test');
      return;
    }

    const trackId = tracks[0].id;
    
    const response = await this.client.post(`/playlists/${playlistId}/tracks`, {
      trackId: trackId
    });
    
    console.log('✅ Track added to playlist');
    console.log('   New track count:', response.data.data.trackCount);
  }

  async testGetPlaylistTracks(playlistId) {
    console.log('5. Testing get playlist tracks...');
    
    const response = await this.client.get(`/playlists/${playlistId}/tracks`);
    
    console.log(`✅ Found ${response.data.data.length} tracks in playlist`);
    
    if (response.data.data.length > 0) {
      console.log('   First track:', response.data.data[0].title);
    }
  }

  async testToggleLike(playlistId) {
    console.log('6. Testing playlist like...');
    
    const response = await this.client.post(`/playlists/${playlistId}/like`);
    
    console.log('✅ Playlist liked:', response.data.data.liked);
    console.log('   Total likes:', response.data.data.likes);
  }

  async testSearchPlaylists() {
    console.log('7. Testing playlist search...');
    
    const response = await this.client.get('/playlists/search?q=rock&limit=5');
    
    console.log(`✅ Found ${response.data.data.length} playlists matching "rock"`);
  }

  async testGetPublicPlaylists() {
    console.log('8. Testing public playlists...');
    
    const response = await this.client.get('/playlists/public?limit=5');
    
    console.log(`✅ Found ${response.data.data.playlists.length} public playlists`);
  }

  async testUpdatePlaylist(playlistId) {
    console.log('9. Testing playlist update...');
    
    const updateData = {
      name: 'Updated Test Playlist',
      description: 'This playlist has been updated',
      isPublic: false,
      tags: ['updated', 'test']
    };

    const response = await this.client.put(`/playlists/${playlistId}`, updateData);
    
    console.log('✅ Playlist updated:', response.data.data.name);
  }

  async testDeletePlaylist(playlistId) {
    console.log('10. Testing playlist deletion...');
    
    const response = await this.client.delete(`/playlists/${playlistId}`);
    
    console.log('✅ Playlist deleted successfully');
  }
}

// Запуск тестов
async function runTests() {
  const tester = new PlaylistTester();
  await tester.runAllTests();
}

// Обработка ошибок
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});