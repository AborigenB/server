import mongoose, { Schema, Document, Types } from 'mongoose';

export interface Token extends Document {
    user: Types.ObjectId;
    refreshToken: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const TokenSchema: Schema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    refreshToken: {
        type: String,
        required: true
    }
}, {
    timestamps: true
})

export default mongoose.model<Token>('Token', TokenSchema);