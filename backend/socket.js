import {colours, AI_RESPONSE_THRESHOLD, getTimestamp} from "./config.js";
import { sessions, createSession} from "./session.js";
import { saveMessage} from "./storage.js";

export function initSocket(io) {
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
            saveMessage(sessionKey, session, message);

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
                            saveMessage(sessionKey, session, aiMessage);
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
}