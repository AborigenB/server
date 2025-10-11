import express from "express";
import connectToMongoDB from "./db/mongodb";
import { config } from "./config/process";
import process from './config/process'
import { connectToSequilizePostgress } from "./db/postgress";

const app = express();
const PORT = config.port;

function runApp () {
    connectToMongoDB()
    connectToSequilizePostgress()
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
runApp();