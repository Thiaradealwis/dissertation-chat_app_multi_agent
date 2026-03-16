import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

import { getOpenAIKey } from "./utils/getAPIKey.js";
import { createSession, sessions } from "./sessions.js";
import { registerSocketHandlers } from "./socketHandlers.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const waitingQueue = [];
const GROUP_SIZE = 3;

app.use(cors({
    origin: "http://localhost:5173",
    methods: ['GET','POST'],
    credentials: true
}));

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Initialize OpenAI client (needed for session creation)
const apiKey = await getOpenAIKey();
export const client = new (await import("openai")).OpenAI({ apiKey });

// Register all socket handlers
registerSocketHandlers(io, sessions, waitingQueue, GROUP_SIZE);

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
