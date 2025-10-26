import mongoose, { Schema, Document, Model } from 'mongoose';
import { User } from '../interfaces/userInterfaces';

export interface UserDocument extends Omit<User, '_id'>, Document {
  _id: User['_id'];
}

// Интерфейс для статических методов модели User
export interface UserModel extends Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
  findByUsername(username: string): Promise<UserDocument | null>;
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password : {
    type: String,
    required: [true, 'Password is required'],
    trim: true,
    minlength: [6, 'Password must be at least 6 characters long']
  },
  avatar: {
    type: String,
    default: null
  },
  followersCount: {
    type: Number,
    default: 0,
    min: 0
  },
  followingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  achievements: [{
    type: String,
    trim: true
  }],
  favoriteGenres: [{
    type: String,
    trim: true
  }],
  totalListeningTime: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  // toJSON: {
  //   transform: function(doc, ret) {
  //     ret.id = ret._id.toString();
  //     delete (ret as any)._id;
  //     delete (ret as any).__v;
  //     return ret;
  //   }
  // }
});

// Индексы для оптимизации запросов
// UserSchema.index({ email: 1 });
// UserSchema.index({ username: 1 });
// UserSchema.index({ createdAt: -1 });
// UserSchema.index({ totalListeningTime: -1 });

// Статические методы
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username: new RegExp(username, 'i') });
};

// Методы экземпляра
UserSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  return this.save();
};

UserSchema.methods.addAchievement = function(achievement: string) {
  if (!this.achievements.includes(achievement)) {
    this.achievements.push(achievement);
  }
  return this.save();
};

UserSchema.methods.addListeningTime = function(minutes: number) {
  this.totalListeningTime += minutes;
  return this.save();
};

UserSchema.methods.updateFavoriteGenres = function(genres: string[]) {
  this.favoriteGenres = [...new Set(genres)]; // Убираем дубликаты
  return this.save();
};

export default mongoose.model<UserDocument, UserModel>('User', UserSchema);