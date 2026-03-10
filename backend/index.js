//initial code from https://www.djamware.com/post/68a6a3707c93f30ea29f62ac/build-a-realtime-chat-app-with-react-nodejs-and-socketio#create-project
import AWS from "aws-sdk";
import {OpenAI} from "openai";
import dotenv from "dotenv";
import {v4 as uuidv4} from "uuid";
import express from "express";
import http from "http";
import {Server} from "socket.io";
import cors from "cors";

import MediatorAgent from "./agents/MediatorAgent.js";
import ConvergenceAgent from "./agents/ConvergenceAgent.js";
import EqualConsiderationAgent from "./agents/EqualConsiderationAgent.js";
import EqualParticipationAgent from "./agents/EqualParticipationAgent.js";
import GroupInfoSharingAgent from "./agents/GroupInfoSharingAgent.js";

dotenv.config();

AWS.config.update({ region: "eu-north-1" });
const secretsClient = new AWS.SecretsManager();
const AI_RESPONSE_THRESHOLD = 6; //how often the AI intervenes
const colours = [
    "Red", "Blue", "Green", "Yellow"
];

function getTimestamp() {
   return new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function getOpenAIKey() {

    if (process.env.OPENAI_API_KEY) {
        console.log("Using OpenAI key from .env");
        return process.env.OPENAI_API_KEY;
    }

    const data = await secretsClient.getSecretValue({
        SecretId: "openAI_key"
    }).promise();

    if ("SecretString" in data) {
        const secret = JSON.parse(data.SecretString);
        return secret["Key: OPENAI_API_KEY"].replace("Value: ", "");
    } else {
        throw new Error("Secret binary format not supported");
    }
}

const app = express();
const server = http.createServer(app);
app.use(cors({
    //origin: 'http://diss-chat-frontend.s3-website.eu-north-1.amazonaws.com', // S3 frontend
    origin: "http://localhost:5173",
    methods: ['GET','POST'],
    credentials: true
}));

const io = new Server(server, {
    cors: {
        //origin: "http://diss-chat-frontend.s3-website.eu-north-1.amazonaws.com",
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const apiKey = await getOpenAIKey();
const client = new OpenAI({ apiKey });
const sessions = {};

function createSession(sessionId){

    const convergenceAgent = new ConvergenceAgent("convergence_agent", client);
    const equalConsiderationAgent = new EqualConsiderationAgent("equalConsiderationAgent", client);
    const equalParticipationAgent = new EqualParticipationAgent("equalParticipationAgent", client);
    const groupInfoSharingAgent = new GroupInfoSharingAgent("groupInfoSharingAgent", client);
    const mediatorAgent = new MediatorAgent("mediatorAgent", client);

    sessions[sessionId] = {
        participants: {},
        messages: [],
        messagesSinceLastIntervention: 0,
        observers: [convergenceAgent, equalConsiderationAgent, equalParticipationAgent, equalParticipationAgent, groupInfoSharingAgent],
        mediator: mediatorAgent,
        lastResponseId: null,
        lastHandledIndex: 0
    };
    return sessions[sessionId];
}

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

io.on("connection", socket => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join session", ({sessionId}) => {
        if (!sessionId) {
            sessionId = uuidv4();
        }

        if (!sessions[sessionId]) {
            createSession(sessionId);
        }

        const session = sessions[sessionId];
        const assignedId = colours[Object.keys(session.participants).length % colours.length];

        session.participants[socket.id] = assignedId

        socket.join(sessionId);

        socket.emit("session joined", {
            sessionId, username: assignedId
        });

        if (session.messages.length > 0) {
            socket.emit("chat history", session.messages);
        }
    });

    socket.on('typing', ({ sessionId, username, isTyping, roomId }) => {
        // Broadcast to everyone else in the room
        socket.to(sessionId).emit('userTyping', { username, isTyping });
    });

    socket.on("chat message", async ({sessionId, content}) => {
        console.log("Message received:", content);

        const session = sessions[sessionId];
        if (!session) return;

        const sender = session.participants[socket.id];

        const message = {sender, content, timestamp: getTimestamp()};

        // Store message
        session.messages.push(message);


        if (message.sender !== "AI Agent") {
            session.messagesSinceLastIntervention++;
            io.to(sessionId).emit("chat message", message);

            if (session.messagesSinceLastIntervention >= AI_RESPONSE_THRESHOLD) {
                try {
                    const summaries = [];
                    for (const observer of session.observers) {
                        const obsSummary = await observer.observe(session.messages);
                        summaries.push(obsSummary); // structured {agent, summary}
                    }
                    io.to(sessionId).emit("ai-start");
                    const mediatorResponse = await session.mediator.intervene(summaries);
                    io.to(sessionId).emit("ai-end");

                    if (mediatorResponse && mediatorResponse !== "") {
                        const aiMessage = {
                            sender: "AI Agent",
                            content: mediatorResponse,
                            timestamp: getTimestamp()
                        };
                        session.messages.push(aiMessage);
                        io.to(sessionId).emit("chat message", aiMessage);
                    }

                    session.messagesSinceLastIntervention = 0;
                } catch (err) {
                    console.error("Error generating AI response:", err);
                }
            }
            if (content.includes("@mediator")) {
                session.messages.push({ sender, content: content });

                await streamAIResponse(session.messages, io, sessionId);
            }

        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0',() => {
    console.log(`Server running on port ${PORT}`);
});