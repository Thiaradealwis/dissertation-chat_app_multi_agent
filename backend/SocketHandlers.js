import { createSession, sessions, colours } from "./sessions.js";
import { v4 as uuidv4 } from "uuid";
import { getTimestamp } from "./utils/getTimestamp.js";
import { intervene } from "./aiIntervention.js";

const AI_RESPONSE_THRESHOLD = 6;

export function registerSocketHandlers(io, sessions, waitingQueue, GROUP_SIZE) {
    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on("join-waiting-room", (participant) => {
            if (!participant.participantId) {
                return socket.emit("error", "Consent or pre-task not completed");
            }

            waitingQueue.push({ ...participant, socketId: socket.id });
            io.emit("waiting-count", waitingQueue.length);

            // If enough participants, create a session
            if (waitingQueue.length >= GROUP_SIZE) {
                const group = waitingQueue.splice(0, GROUP_SIZE);
                const sessionId = uuidv4();
                const session = createSession(sessionId);
                console.log(sessionId);

                // Notify participants
                group.forEach(p =>
                    io.to(p.socketId).emit("session-start", { sessionId })
                );

                // Notify moderator page
                io.emit("sessions-updated", { sessionId });
            }
        });

        // Moderator controls
        socket.on("moderator-start-session", () => {
            const sessionId = uuidv4();
            createSession(sessionId);
            console.log(`Moderator started session: ${sessionId}`);
            socket.emit("session-created", { sessionId });
            io.emit("sessions-updated", Object.keys(sessions));
        });

        socket.on("moderator-stop-session", ({ sessionId }) => {
            const session = sessions[sessionId];
            if (!session) return;
            session.active = false;
            console.log(`Moderator stopped session: ${sessionId}`);
            io.to(sessionId).emit("session-stopped");
            io.emit("sessions-updated", Object.keys(sessions));
        });

        socket.on("moderator-switch-session", ({ sessionId }) => {
            const session = sessions[sessionId];
            if (!session) {
                socket.emit("error", "Session not found");
                return;
            }
            socket.emit("session-messages", session.messages);
            socket.emit("current-session", { sessionId });
        });

        socket.on("moderator-toggle-ai", ({ sessionId, active }) => {
            console.log(active);
            const session = sessions[sessionId];
            if (!session) return;
            session.mediatorActive = active;
            io.to(sessionId).emit("ai-toggled", { active });
        });

        // User joins session
        socket.on("join session", ({ sessionId }) => {
            if (!sessionId) sessionId = uuidv4();
            if (!sessions[sessionId]) createSession(sessionId);

            const session = sessions[sessionId];
            const assignedId = colours[Object.keys(session.participants).length % colours.length];

            session.participants[socket.id] = assignedId;
            socket.join(sessionId);

            socket.emit("session joined", { sessionId, username: assignedId });
            if (session.messages.length > 0) socket.emit("chat history", session.messages);
        });

        socket.on("chat message", async ({ sessionId, content }) => {
            const session = sessions[sessionId];

            if (!session) return;

            const sender = session.participants[socket.id];
            const message = { sender, content, timestamp: getTimestamp() };
            session.messages.push(message);

            io.to(sessionId).emit("chat message", message);

            if (message.sender !== "Mediator") {
                // Increment counter for normal AI-threshold
                session.messagesSinceLastIntervention++;
                // --- @mediator trigger ---
                if (session.mediatorActive && content.includes("@mediator")) {
                    try {
                        await intervene(session, session.lastSummaries, io, sessionId);
                    } catch (err) {
                        console.error("Error generating mediator-triggered AI response:", err);
                    }
                }

                // --- Threshold trigger (every 6 messages) ---
                if (session.mediatorActive && session.messagesSinceLastIntervention >= AI_RESPONSE_THRESHOLD) {
                    session.messagesSinceLastIntervention = 0; // only reset here
                    try {
                        const summaries = await Promise.all(
                            session.observers.map(observer => observer.observe(session.messages))
                        );
                        session.lastSummaries = summaries;
                        await intervene(session, summaries, io, sessionId);
                    } catch (err) {
                        console.error("Error generating threshold AI response:", err);
                    }
                }
            }
        });

        socket.on("typing", ({ sessionId, username, isTyping }) => {
            socket.to(sessionId).emit("userTyping", { username, isTyping });
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
}