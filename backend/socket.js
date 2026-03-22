import {colours, OBSERVER_THRESHOLD, AI_RESPONSE_THRESHOLD, getTimestamp} from "./config.js";
import { sessions, createSession} from "./session.js";
import {saveMessage, saveSummaryReports} from "./storage.js";

export function initSocket(io, client) {
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
            createSession(sessionKey, client);
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

            if (message.sender !== "Mediator") {
                session.messagesSinceLastIntervention++;
                session.generateSummariesCounter++;
                io.to(sessionKey).emit("chat message", message);

                if (session.mediatorOn && session.generateSummariesCounter >= OBSERVER_THRESHOLD && session.messages.length > 15) {
                    session.generateSummariesCounter=0;
                    try {
                        let newSummaries = [];
                        try {
                            newSummaries = await Promise.all(
                                session.observers.map(observer => observer.observe(session.messages))
                            );
                            session.summaries.push(...newSummaries);
                            saveSummaryReports(sessionKey, session, session.summaries);
                        } catch (err) {
                            console.error("Error generating observer summaries:", err);
                            return;
                        }
                        const scores = newSummaries.map(x => {
                            const m = x.summary.match(/Score:\s*([\d.]+)/);
                            const score = m ? parseFloat(m[1]) : null;

                            return {
                                agent: x.agent,
                                score: x.agent === "convergence_agent" && score !== null
                                    ? 1 - score
                                    : score
                            };
                        });
                        const lowest = scores.reduce((min, curr) =>
                            curr.score < min.score ? curr : min
                        );
                        console.log(lowest)
                        if (lowest.score < 0.5 && session.messagesSinceLastIntervention > 3){
                            io.to(sessionKey).emit("ai-start");
                            let mediatorResponse = "";
                            try {
                                session.messagesSinceLastIntervention = 0;
                                mediatorResponse = await session.mediator.intervene(newSummaries, session.messages, lowest.agent);
                            } catch (err) {
                                console.error("Error generating mediator response:", err);
                                return;
                            }
                            io.to(sessionKey).emit("ai-end");

                            if (mediatorResponse && mediatorResponse !== "") {
                                const aiMessage = {
                                    sender: "Mediator",
                                    content: mediatorResponse,
                                    timestamp: getTimestamp()
                                };
                                session.messages.push(aiMessage);
                                saveMessage(sessionKey, session, aiMessage);
                                io.to(sessionKey).emit("chat message", aiMessage);
                            }

                            session.mediator.lastHandledIndex = session.messages.length;
                        }

                    } catch (err) {
                        console.error("Error generating AI response:", err);
                    }
                }

                if (session.mediatorOn && content.includes("@mediator")) {
                    try {
                        io.to(sessionKey).emit("ai-start");

                        // call mediator directly
                        const mediatorResponse = await session.mediator.intervene([], session.messages, null);

                        io.to(sessionKey).emit("ai-end");

                        if (mediatorResponse && mediatorResponse !== "") {
                            const aiMessage = {
                                sender: "Mediator",
                                content: mediatorResponse,
                                timestamp: getTimestamp()
                            };
                            session.messages.push(aiMessage);
                            saveMessage(sessionKey, session, aiMessage);
                            io.to(sessionKey).emit("chat message", aiMessage);
                        }

                        // reset threshold counter
                        session.messagesSinceLastIntervention = 0;
                        session.mediator.lastHandledIndex = session.messages.length;
                    } catch (err) {
                        console.error("Error generating mediator response:", err);
                    }
                }

                if (session.mediatorOn && session.messagesSinceLastIntervention >= AI_RESPONSE_THRESHOLD){
                    let newSummaries = [];
                    try {
                        newSummaries = await Promise.all(
                            session.observers.map(observer => observer.observe(session.messages))
                        );
                        session.summaries.push(...newSummaries);
                        saveSummaryReports(sessionKey, session, session.summaries);
                    } catch (err) {
                        console.error("Error generating observer summaries:", err);
                        return;
                    }
                    io.to(sessionKey).emit("ai-start");
                    let mediatorResponse = "";
                    try {
                        session.messagesSinceLastIntervention = 0;
                        mediatorResponse = await session.mediator.intervene(newSummaries, session.messages, "");
                    } catch (err) {
                        console.error("Error generating mediator response:", err);
                        return;
                    }
                    io.to(sessionKey).emit("ai-end");

                    if (mediatorResponse && mediatorResponse !== "") {
                        const aiMessage = {
                            sender: "Mediator",
                            content: mediatorResponse,
                            timestamp: getTimestamp()
                        };
                        session.messages.push(aiMessage);
                        saveMessage(sessionKey, session, aiMessage);
                        io.to(sessionKey).emit("chat message", aiMessage);
                    }

                    session.mediator.lastHandledIndex = session.messages.length;
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