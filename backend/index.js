//initial code from https://www.djamware.com/post/68a6a3707c93f30ea29f62ac/build-a-realtime-chat-app-with-react-nodejs-and-socketio#create-project

import {OpenAI} from "openai";
import express from "express";
import http from "http";
import {Server} from "socket.io";
import cors from "cors";
import {getOpenAIKey} from "./config.js";
const app = express();
const server = http.createServer(app);


import {sessions} from "./session.js";
import {initSocket} from "./socket.js";

app.use(cors({
    origin: 'http://diss-chat-mas.s3-website.eu-north-1.amazonaws.com',
    methods: ['GET', 'POST']
}));

const io = new Server(server, {
    cors: {
        origin: "http://diss-chat-mas.s3-website.eu-north-1.amazonaws.com",
        methods: ["GET", "POST"]
    }
});

const apiKey = await getOpenAIKey();
const client = new OpenAI({ apiKey });
io._client = client

app.get("/transcript/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessions[sessionId];

    if (!session) {
        return res.status(404).send("Session not found");
    }

    let transcript = `Session ID: ${sessionId}\n\nParticipants:\n`;

    Object.values(session.participants).forEach(name => {
        transcript += `- ${name}\n`;
    });

    transcript += "\n--- Transcript ---\n\n";

    session.messages.forEach(msg => {
        transcript += `[${msg.timestamp}] ${msg.sender}: ${msg.content}\n`;
    });

    res.setHeader("Content-disposition", `attachment; filename=transcript-${sessionId}.txt`);
    res.setHeader("Content-Type", "text/plain");
    res.send(transcript);
});

initSocket(io, client);

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
