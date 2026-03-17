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
const AI_RESPONSE_THRESHOLD = 6;
const colours = ["Red", "Blue", "Green", "Yellow"];

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
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
}));

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const apiKey = await getOpenAIKey();
const client = new OpenAI({ apiKey });
const sessions = {};

function createSession(sessionId) {
    const convergenceAgent = new ConvergenceAgent("convergence_agent", client);
    const equalConsiderationAgent = new EqualConsiderationAgent("equalConsiderationAgent", client);
    const equalParticipationAgent = new EqualParticipationAgent("equalParticipationAgent", client);
    const groupInfoSharingAgent = new GroupInfoSharingAgent("groupInfoSharingAgent", client);
    const mediatorAgent = new MediatorAgent("mediatorAgent", client);

    sessions[sessionId] = {
        participants: {},
        participantIDs: {},
        messages: [],
        messagesSinceLastIntervention: 0,
        observers: [convergenceAgent, equalConsiderationAgent, equalParticipationAgent, groupInfoSharingAgent],
        mediator: mediatorAgent,
        lastResponseId: null,
        lastHandledIndex: 0,
        scenario: null,
        mediatorOn: false,
        round: null
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

io.on("connection", async socket => {
    const {
        participantID,
        groupID,
        scenario,
        mediator,
        round
    } = socket.handshake.query;

    console.log(`User connected: ${socket.id} | group: ${groupID} | scenario: ${scenario} | mediator: ${mediator}`);
    const sessionKey = `${groupID}-round${round}`;

    if (!sessions[sessionKey]) {
        createSession(sessionKey);
    }

    const session = sessions[sessionKey];

    // Simple colour assignment — next available colour for this session
    const assignedColour = colours[Object.keys(session.participants).length % colours.length];
    session.participants[socket.id] = assignedColour;
    session.participantIDs[socket.id] = participantID;

    if (!session.scenario) {
        session.scenario = scenario;
        session.mediatorOn = mediator === "on";
        session.round = round;
        console.log(`Session ${sessionKey}: scenario=${scenario}, mediatorOn=${session.mediatorOn}`);
    }

    socket.join(sessionKey);

    socket.emit("session joined", {
        sessionId: sessionKey,
        username: assignedColour
    });

    if (session.messages.length > 0) {
        socket.emit("chat history", session.messages);
    }

    socket.on('typing', ({ username, isTyping }) => {
        socket.to(sessionKey).emit('userTyping', { username, isTyping });
    });

    socket.on("chat message", async ({ content }) => {
        console.log("Message received:", content);

        const session = sessions[sessionKey];
        if (!session) return;

        const sender = session.participants[socket.id];
        const message = { sender, content, timestamp: getTimestamp() };

        session.messages.push(message);

        if (message.sender !== "AI Agent") {
            session.messagesSinceLastIntervention++;
            io.to(sessionKey).emit("chat message", message);

            if (session.mediatorOn && session.messagesSinceLastIntervention >= AI_RESPONSE_THRESHOLD) {
                try {
                    let summaries = [];
                    try {
                        summaries = await Promise.all(
                            session.observers.map(observer => observer.observe(session.messages))
                        );
                    } catch (err) {
                        console.error("Error generating observer summaries:", err);
                        return;
                    }

                    io.to(sessionKey).emit("ai-start");
                    let mediatorResponse = "";
                    try {
                        mediatorResponse = await session.mediator.intervene(summaries, session.messages);
                    } catch (err) {
                        console.error("Error generating mediator response:", err);
                        return;
                    }
                    io.to(sessionKey).emit("ai-end");

                    if (mediatorResponse && mediatorResponse !== "") {
                        const aiMessage = {
                            sender: "AI Agent",
                            content: mediatorResponse,
                            timestamp: getTimestamp()
                        };
                        session.messages.push(aiMessage);
                        io.to(sessionKey).emit("chat message", aiMessage);
                    }

                    session.messagesSinceLastIntervention = 0;
                    session.mediator.lastHandledIndex = session.messages.length;
                } catch (err) {
                    console.error("Error generating AI response:", err);
                }
            }

            if (session.mediatorOn && content.includes("@mediator")) {
                await streamAIResponse(session.messages, io, sessionKey);
            }
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);
        if (sessions[groupID]) {
            delete sessions[sessionKey].participants[socket.id];
        }
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
