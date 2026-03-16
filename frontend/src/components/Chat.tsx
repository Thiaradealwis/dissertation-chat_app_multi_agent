import { useState, useEffect} from "react";
import socket from "../socket";
import "./Chat.css";
import {MessagesContainer} from "./MessagesContainer.tsx";
import ChatInput from "./InputControls.tsx";

interface Message {
    sender: string;
    content: string;
    time?: string;
}

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");

    const [username, setUsername] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [isUserTyping, setIsUserTyping] = useState(false);



    // @ts-ignore
    useEffect(() => {
        socket.on('userTyping', ({ username: user, isTyping }) => {
            setTypingUsers((prev) => {
                const newSet = new Set(prev);
                if (isTyping) newSet.add(user);
                else newSet.delete(user);
                return newSet;
            });
        });

        return () => socket.off('userTyping');
    }, []);

    useEffect(() => {
        // Get sessionId from URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const sharedSessionId = urlParams.get("sessionId"); // e.g., ?sessionId=abc123

        // Join the session (existing or new)
        socket.emit("join session", { sessionId: sharedSessionId });

        socket.on("session joined", ({ sessionId, username }) => {
            setUsername(username);
            setSessionId(sessionId);
        });

        // Listen for messages
        socket.on("chat message", (msg: Message) => {
            setMessages((prev) => [msg, ...prev]);
        });

        socket.on("ai-start", () => {
            setIsTyping(true);

        });

        socket.on("ai-update", (text: string) => {
            setMessages((prev) => [{ sender: "Mediator", content: text }, ...prev]);
        });

        socket.on("ai-end", () => setIsTyping(false));

        return () => {
            socket.off("session joined");
            socket.off("chat message");
            socket.off("ai-start");
            socket.off("ai-update");
            socket.off("ai-end");
        };
    }, []);

    useEffect(() => {
        socket.on("chat history", (history: Message[]) => {
            setMessages(history);
        });

        return () => {
            socket.off("chat history");
        };
    }, []);

    const sendMessage = () => {
        if (!input.trim() || !username || !sessionId) return;

        socket.emit("chat message", { sessionId, content: input });
        setInput("");
    };

    return (
        <div className="app-container">
            {/* Messages area */}
            <MessagesContainer messages={messages} typingUsers={typingUsers} isTyping={isTyping}/>
            <ChatInput input={input}
                       setInput={setInput}
                       sessionId={sessionId}
                       username={username}
                       isUserTyping={isUserTyping}
                       setIsUserTyping={setIsUserTyping}
                       sendMessage={sendMessage}
                       />

        </div>
    );
}