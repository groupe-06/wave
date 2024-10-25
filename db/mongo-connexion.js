import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectToMongo = async () => {
    try {
        const conn = await mongoose.connect(process.env.DATABASE_URL);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log("Error connecting to MongoDB", error);
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectToMongo;