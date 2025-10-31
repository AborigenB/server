import mongoose, { Schema, Document, Types } from 'mongoose';
import { IPlaylist } from '../interfaces/playlistInterfaces';

const PlaylistSchema: Schema = new Schema({
    navidromeId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Playlist name is required'],
        trim: true,
        maxlength: [100, 'Playlist name cannot exceed 100 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    coverArt: String,
    trackCount: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number,
        default: 0
    },
    plays: {
        type: Number,
        default: 0
    },
    likes: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    tags: [String],
    trackIds: [String], // Кэш track IDs для быстрого поиска
    syncedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

PlaylistSchema.index({ owner: 1, createdAt: -1 });
PlaylistSchema.index({ isPublic: 1, likes: -1 });
PlaylistSchema.index({ tags: 1 });
PlaylistSchema.index({ navidromeId: 1 }, { unique: true });

export default mongoose.model<IPlaylist>('Playlist', PlaylistSchema);