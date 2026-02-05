import mongoose from "mongoose";

const connectDB = async () => {
    try{
        let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
        const dbName = 'POS';

        const url = new URL(mongoUri.replace('mongodb://', 'http://'));
        const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

        // Only use auth for non-local MongoDB (local Docker Mongo typically has no auth)
        const user = process.env.MONGODB_USER;
        const password = process.env.MONGODB_PASSWORD;
        const authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';

        if (!isLocalhost && user && password) {
            mongoUri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${url.hostname}:${url.port || 27017}/${dbName}?authSource=${authSource}`;
        } else {
            mongoUri = `${mongoUri.endsWith('/') ? mongoUri.slice(0, -1) : mongoUri}/${dbName}`;
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');
    }catch (err){
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
}

export default connectDB;