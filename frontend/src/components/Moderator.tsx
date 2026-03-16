// ModeratorPage.tsx
import { useState, useEffect } from "react";
import socket from "../socket";
import { v4 as uuidv4 } from "uuid";
import {MessagesContainer} from "./MessagesContainer";
import './Moderator.css'

interface Message {
    sender: string;
    content: string;
    timestamp?: string;
}

export default function ModeratorPanel() {
    const [activeSession, setActiveSession] = useState<string | null>(null);
    const [allSessions, setAllSessions] = useState<string[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [aiActive, setAiActive] = useState(true);

    // Create new session
    const createSession = () => {
        const newSessionId = uuidv4()
        socket.emit("create session", { sessionId: newSessionId });
        setActiveSession(newSessionId);
        setAllSessions((prev) => [...prev, newSessionId]);
        setMessages([]);
    };

    // Switch session
    const switchSession = (sessionId: string) => {
        setActiveSession(sessionId);
        socket.emit("moderator-switch-session", { sessionId });
    };

    // Stop session
    const stopSession = () => {
        if (!activeSession) return;
        socket.emit("stop session", { sessionId: activeSession });
        alert(`Session ${activeSession} stopped`);
        setActiveSession(null);
        setMessages([]);
    };

    useEffect(() => {
        if (!activeSession) return;

        // Join the active session room
        socket.emit("join session", { sessionId: activeSession });

        // Load existing messages for that session
        socket.emit("get-session-messages", { sessionId: activeSession });

        const handleHistory = (msgs: Message[]) => setMessages(msgs);

        // Listen for session history
        socket.on("session-messages", handleHistory);

        // Listen for new messages from the active session
        socket.on("chat message", (msg: Message) => {
            setMessages((prev) => [msg, ...prev]);
        });

        return () => {
            socket.off("session-messages", handleHistory);
            socket.off("chat message");
        };
    }, [activeSession]);

    useEffect(() => {
        // Listen for sessions created automatically (from waiting room)
        const handleNewSession = (session: { sessionId: string }) => {
            setAllSessions((prev) => {
                // Avoid duplicates
                if (!prev.includes(session.sessionId)) {
                    return [...prev, session.sessionId];
                }
                return prev;
            });
        };

        socket.on("sessions-updated", handleNewSession);

        return () => {
            socket.off("new-session", handleNewSession);
        };
    }, []);

    return (
        <div className="app-container">
            <h2>Moderator Controls</h2>

            <div className="controls">
                <button onClick={createSession}>Create Session</button>

                <select
                    value={activeSession || ""}
                    onChange={(e) => switchSession(e.target.value)}
                >
                    <option value="" disabled>
                        Switch session
                    </option>
                    {allSessions.map((sid) => (
                        <option key={sid} value={sid}>
                            {sid}
                        </option>
                    ))}
                </select>

                <button onClick={stopSession} disabled={!activeSession}>
                    Stop Session
                </button>

                <label>
                    AI Active:
                    <input
                        type="checkbox"
                        checked={aiActive}
                        onChange={(e) => {
                            const active = e.target.checked;
                            setAiActive(active);
                            if (active && activeSession)
                                socket.emit("moderator-toggle-ai", { active, sessionId: activeSession });
                        }}
                    />
                </label>
            </div>

            <div className="current-session">
                Current Session: {activeSession || "None"}
            </div>

            {activeSession && (
                <>
                    <div className="share-link">
                        Share this link to join:{" "}
                        <code>{`${window.location.origin}?sessionId=${activeSession}`}</code>
                    </div>
                    <MessagesContainer messages={messages}  isTyping={false} typingUsers={new Set()}/>
                    <button
                        onClick={() =>
                            window.open(
                                `http://localhost:4000/transcript/${activeSession}`
                            )
                        }
                    >
                        Download Transcript
                    </button>
                </>
            )}
        </div>
    );
}
