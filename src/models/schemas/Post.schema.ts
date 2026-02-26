import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IPost extends Document {
  user: mongoose.Types.ObjectId
  content?: string
  image?: string
}

const PostSchema: Schema<IPost> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    image: { type: String }
  },
  { timestamps: true }
)

const Post = mongoose.model<IPost>('Post', PostSchema)

export default Post
