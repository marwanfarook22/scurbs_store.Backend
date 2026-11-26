
import mongoose from "mongoose";
import { DB_URL, NODE_ENV } from "../config/env.js";
import Usermodule from "../models/users.models.js";

if (!DB_URL) {
    throw new Error("DB_URL is not defined in the environment variables");
}

// Connect to MongoDB

const connectDB = async () => {

    try {
        await mongoose.connect(DB_URL, {});
        const hasUserCollection = await mongoose.connection.db
            .listCollections({ name: Usermodule.collection.name }, { nameOnly: true })
            .hasNext();
        if (!hasUserCollection) {
            await Usermodule.createCollection();
        }

        const indexes = await Usermodule.collection.indexes();
        const oldPhoneIndex = indexes.find(
            (index) =>
                Object.keys(index.key).length === 1 &&
                index.key.phoneNumber === 1 &&
                index.unique &&
                !index.sparse &&
                !index.partialFilterExpression,
        );
        if (oldPhoneIndex) {
            await Usermodule.collection.dropIndex(oldPhoneIndex.name);
        }
        await Usermodule.createIndexes();
        console.log(`MongoDB connected successfully in ${NODE_ENV} mode`);

    }
    catch (error) {
        console.error("Error connecting to Database:", error);
        process.exit(1);
    }
}

export default connectDB;