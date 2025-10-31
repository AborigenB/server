import axios, { AxiosInstance } from 'axios';
import { ApiError } from '../exceptions/apiErrors';
import { NavidromeTrack, SearchResult, NavidromeArtist, NavidromeAlbum } from '../interfaces/navidromeInterfaces';
import process, { config } from '../config/process';
export class NavidromeService {
    private client: AxiosInstance;
    private baseUrl: string;
    private isHealthy: boolean = false;

    constructor() {
        if (!config.navidromeUrl) {
            throw new Error('MONGO_DB_URL is not defined in environment variables');
        }
        this.baseUrl = config.navidromeUrl;

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            params: {
                u: config.navidromeUser,
                p: config.navidromePassword,
                v: '1.16.1', // Subsonic API version
                c: 'sound-app', // Client name
                f: 'json' // Response format
            }
        });

        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        this.client.interceptors.response.use(
            (response) => {
                const data = response.data['subsonic-response'];

                if (data.status !== 'ok') {
                    throw new Error(data.error?.message || `Navidrome API error: ${data.status}`);
                }

                this.isHealthy = true;
                return response;
            },
            (error) => {
                console.error('Navidrome API error:', {
                    url: error.config?.url,
                    status: error.response?.status,
                    message: error.message
                });

                this.isHealthy = false;

                if (error.code === 'ECONNREFUSED') {
                    throw ApiError.Internal('Navidrome is not running');
                }

                if (error.response?.status === 401) {
                    throw ApiError.Unauthorized('Invalid Navidrome credentials');
                }

                throw ApiError.Internal('Music service temporarily unavailable');
            }
        );
    }

    async performHealthCheck(): Promise<boolean> {
        try {
            console.log('Performing Navidrome health check...');

            const response = await this.client.get('/rest/ping.view', {
                timeout: 5000
            });

            const data = response.data['subsonic-response'];
            this.isHealthy = data.status === 'ok';

            console.log(`✅ Navidrome health: ${this.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
            return this.isHealthy;

        } catch (error: any) {
            this.isHealthy = false;
            console.error('❌ Navidrome health check failed:', error.message);
            return false;
        }
    }

    // Получение списка треков
    async getTracks(limit: number = 50, offset: number = 0): Promise<NavidromeTrack[]> {
        try {
            const response = await this.client.get('/rest/getRandomSongs.view', {
                params: {
                    size: limit,
                    offset: offset
                }
            });

            const data = response.data['subsonic-response'];

            if (data.status !== 'ok') {
                throw new Error(data.error?.message || 'Failed to fetch tracks');
            }

            return data.randomSongs?.song?.map(this.mapTrack) || [];
        } catch (error) {
            console.error('Error fetching tracks:', error);
            return this.getMockTracks(limit);
        }
    }

    // Поиск музыки
    async search(query: string, limit: number = 20): Promise<SearchResult> {
        try {
            const response = await this.client.get('/rest/search3.view', {
                params: {
                    query: query,
                    songCount: limit,
                    artistCount: limit,
                    albumCount: limit
                }
            });

            const data = response.data['subsonic-response'];
            const result = data.searchResult3;

            return {
                tracks: result.song?.map(this.mapTrack) || [],
                artists: result.artist?.map(this.mapArtist) || [],
                albums: result.album?.map(this.mapAlbum) || []
            };
        } catch (error) {
            console.error('Search error:', error);
            return this.getMockSearchResults(query, limit);
        }
    }

    // Получение трека по ID
    async getTrackById(trackId: string): Promise<NavidromeTrack | null> {
        try {
            const response = await this.client.get('/rest/getSong.view', {
                params: { id: trackId }
            });

            const data = response.data['subsonic-response'];

            return this.mapTrack(data.song);
        } catch (error) {
            console.error('Error fetching track:', error);
            return null;
        }
    }

    // Получение артистов
    async getArtists(): Promise<NavidromeArtist[]> {
        try {
            const response = await this.client.get('/rest/getArtists.view');

            const data = response.data['subsonic-response'];

            // Структура: data.artists.index[].artist[]
            const artists: NavidromeArtist[] = [];
            data.artists.index?.forEach((index: any) => {
                if (index.artist) {
                    artists.push(...index.artist.map(this.mapArtist));
                }
            });

            return artists;
        } catch (error) {
            console.error('Error fetching artists:', error);
            return [];
        }
    }

    // ✅ Получение альбомов
    async getAlbums(limit: number = 50): Promise<NavidromeAlbum[]> {
        try {
            const response = await this.client.get('/rest/getAlbumList2.view', {
                params: {
                    type: 'random', // или 'newest', 'alphabeticalByName', 'alphabeticalByArtist'
                    size: limit
                }
            });

            const data = response.data['subsonic-response'];

            // Структура: data.albumList2.album[]
            return data.albumList2?.album?.map(this.mapAlbum) || [];
        } catch (error) {
            console.error('Error fetching albums:', error);
            return [];
        }
    }

    // Создание плейлиста
    async createPlaylist(name: string, trackIds: string[]): Promise<string> {
        try {
            const response = await this.client.get('/rest/createPlaylist.view', {
                params: {
                    name: name,
                    songId: trackIds
                }
            });

            const data = response.data['subsonic-response'];

            if (data.status !== 'ok') {
                throw new Error(data.error?.message || 'Failed to create playlist');
            }

            return data.playlist.id;
        } catch (error) {
            console.error('Error creating playlist:', error);
            throw error;
        }
    }

    // Увеличить счетчик прослушиваний
    async scrobble(trackId: string, submission: boolean = true): Promise<void> {
        try {
            await this.client.get('/rest/scrobble', {
                params: {
                    id: trackId,
                    submission: submission
                }
            });
        } catch (error) {
            console.error('Error scrobbling:', error);
            // Не бросаем ошибку, т.к. это не критично
        }
    }

    // Долучение данных о сервере
    async getServerInfo(): Promise<any> {
        try {
            const response = await this.client.get('/rest/getLicense.view');
            const data = response.data['subsonic-response'];

            return {
                version: data.version,
                server: 'Navidrome',
                license: data.license
            };
        } catch (error) {
            console.error('Error getting server info:', error);
            return null;
        }
    }

    async getPlaylistInfo(playlistId: string): Promise<any> {
        try {
            const response = await this.client.get('/rest/getPlaylist.view', {
                params: { id: playlistId }
            });

            const data = response.data['subsonic-response'];

            if (data.status !== 'ok') {
                throw new Error(data.error?.message || 'Failed to get playlist info');
            }

            return data.playlist;
        } catch (error) {
            console.error('Error getting playlist info:', error);
            throw error;
        }
    }

    // Обновление плейлиста
    async updatePlaylist(playlistId: string, trackIds: string[]): Promise<void> {
        try {
            // Navidrome API требует пересоздания плейлиста для обновления
            // Сначала получаем информацию о текущем плейлисте
            const playlistInfo = await this.getPlaylistInfo(playlistId);

            // Удаляем старый плейлист (если возможно)
            // И создаем новый с обновленными треками
            const newPlaylistId = await this.createPlaylist(playlistInfo.name, trackIds);

            // Здесь может потребоваться дополнительная логика для сохранения ID
            console.log('Playlist updated, new ID:', newPlaylistId);

        } catch (error) {
            console.error('Error updating playlist:', error);
            throw error;
        }
    }

    // Получение плейлистов пользователя из Navidrome
    async getUserPlaylists(): Promise<any[]> {
        try {
            const response = await this.client.get('/rest/getPlaylists.view');

            const data = response.data['subsonic-response'];

            if (data.status !== 'ok') {
                throw new Error(data.error?.message || 'Failed to get playlists');
            }

            return data.playlists?.playlist || [];
        } catch (error) {
            console.error('Error getting user playlists:', error);
            return [];
        }
    }

    // Private mapping methods
    private mapTrack(track: any): NavidromeTrack {
        return {
            id: track.id,
            title: track.title,
            artist: track.artist,
            artistId: track.artistId,
            album: track.album,
            albumId: track.albumId,
            duration: track.duration,
            genre: track.genre ? [track.genre] : [],
            year: track.year,
            trackNumber: track.track,
            size: track.size,
            contentType: track.contentType,
            suffix: track.suffix,
            path: track.path,
            playCount: track.playCount || 0,
            coverArt: track.coverArt
        };
    }

    private mapArtist(artist: any): NavidromeArtist {
        return {
            id: artist.id,
            name: artist.name,
            albumCount: artist.albumCount,
            coverArt: artist.coverArt
        };
    }

    private mapAlbum(album: any): NavidromeAlbum {
        return {
            id: album.id,
            name: album.name,
            artist: album.artist,
            artistId: album.artistId,
            coverArt: album.coverArt,
            songCount: album.songCount,
            duration: album.duration,
            year: album.year,
            genre: album.genre
        };
    }

    // Mock данные для fallback
    private getMockTracks(limit: number): NavidromeTrack[] {
        console.log('🎵 Using mock tracks data');

        const mockTracks: NavidromeTrack[] = [
            {
                id: 'mock-1',
                title: 'Bohemian Rhapsody',
                artist: 'Queen',
                artistId: 'artist-1',
                album: 'A Night at the Opera',
                albumId: 'album-1',
                duration: 354,
                genre: ['Rock'],
                year: 1975,
                trackNumber: 1,
                size: 10240000,
                contentType: 'audio/mpeg',
                suffix: 'mp3',
                path: '/music/queen/bohemian_rhapsody.mp3',
                playCount: 0,
                coverArt: 'al-1'
            },
            {
                id: 'mock-2',
                title: 'Sweet Child O\'Mine',
                artist: 'Guns N\' Roses',
                artistId: 'artist-2',
                album: 'Appetite for Destruction',
                albumId: 'album-2',
                duration: 356,
                genre: ['Rock', 'Hard Rock'],
                year: 1987,
                trackNumber: 5,
                size: 9800000,
                contentType: 'audio/mpeg',
                suffix: 'mp3',
                path: '/music/guns_n_roses/sweet_child.mp3',
                playCount: 0,
                coverArt: 'al-2'
            }
        ];

        return mockTracks.slice(0, limit);
    }

    private getMockSearchResults(query: string, limit: number): SearchResult {
        const mockTracks = this.getMockTracks(limit).filter(track =>
            track.title.toLowerCase().includes(query.toLowerCase()) ||
            track.artist.toLowerCase().includes(query.toLowerCase())
        );

        return {
            tracks: mockTracks,
            artists: [
                {
                    id: 'artist-1',
                    name: 'Queen',
                    albumCount: 15,
                    coverArt: 'ar-1'
                }
            ],
            albums: [
                {
                    id: 'album-1',
                    name: 'A Night at the Opera',
                    artist: 'Queen',
                    artistId: 'artist-1',
                    coverArt: 'al-1',
                    songCount: 12,
                    duration: 2546,
                    year: 1975,
                    genre: 'Rock'
                }
            ]
        };
    }
}
export default new NavidromeService();
