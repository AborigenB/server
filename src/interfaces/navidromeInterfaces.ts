export interface NavidromeTrack {
    id: string;
    title: string;
    artist: string;
    artistId: string;
    album: string;
    albumId: string;
    duration: number;
    genre: string[];
    year?: number;
    trackNumber?: number;
    size: number;
    contentType: string;
    suffix: string;
    path: string;
    playCount: number;
    coverArt?: string;
}

export interface NavidromeArtist {
    id: string;
    name: string;
    albumCount: number;
    coverArt?: string;
}

export interface NavidromeAlbum {
    id: string;
    name: string;
    artist: string;
    artistId: string;
    coverArt?: string;
    songCount: number;
    duration: number;
    year?: number;
    genre?: string;
}

export interface SearchResult {
    tracks: NavidromeTrack[];
    artists: NavidromeArtist[];
    albums: NavidromeAlbum[];
}