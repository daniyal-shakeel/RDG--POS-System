import mongoose from "mongoose";

const connectDB = async () => {
    try{
        let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
        const dbName = 'POS';

        // If MongoDB auth credentials are set, build connection string with auth
        const user = process.env.MONGODB_USER;
        const password = process.env.MONGODB_PASSWORD;
        const authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';

        if (user && password) {
            // Parse the base URI and inject credentials (handles mongodb://host:port format)
            const url = new URL(mongoUri.replace('mongodb://', 'http://'));
            mongoUri = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${url.hostname}:${url.port || 27017}/${dbName}?authSource=${authSource}`;
        } else {
            mongoUri = `${mongoUri}/${dbName}`;
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');
    }catch (err){
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
}

export default connectDB;