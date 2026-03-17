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
    const [taskComplete, setTaskComplete] = useState(false);
    const typingTimeout = useRef(null);


    const handleInputChange = (e: { target: { value: SetStateAction<string>; }; }) => {
        setInput(e.target.value);

        if (!isUserTyping) {
            setIsUserTyping(true);
            socket.emit('typing', { username, isTyping: true });
        }

        if (typingTimeout.current) clearTimeout(typingTimeout.current);

        // @ts-ignore
        typingTimeout.current = setTimeout(() => {
            setIsUserTyping(false);
            socket.emit('typing', { username, isTyping: false });
        }, 1000);
    };

    useEffect(() => {
        socket.on('userTyping', ({ username: user, isTyping }) => {
            setTypingUsers((prev) => {
                const newSet = new Set(prev);
                if (isTyping) newSet.add(user);
                else newSet.delete(user);
                return newSet;
            });
        });

        return () => {socket.off('userTyping')};
    }, []);

    useEffect(() => {
        // Empirica passes groupID via URL params into the iframe
        //const urlParams = new URLSearchParams(window.location.search);
        //const sessionId = urlParams.get("groupID");

        // Backend sets up session from URL params on connection
        // so we just wait for session joined confirmation
        socket.on("session joined", ({ sessionId, username }) => {
            setUsername(username);
            setSessionId(sessionId); // this will be the groupID
        });

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

        // Signal to Empirica that this stage is complete
        socket.on("task-complete", () => {
            setTaskComplete(true);
            window.parent.postMessage({ type: 'STAGE_COMPLETE' }, '*');
        });

        return () => {
            socket.off("session joined");
            socket.off("chat message");
            socket.off("ai-start");
            socket.off("ai-update");
            socket.off("ai-end");
            socket.off("task-complete");
        };
    }, []);

    useEffect(() => {
        socket.on("chat history", (history: Message[]) => {
            setMessages(history);
        });

        return () => {socket.off("chat history")};
    }, []);

    const sendMessage = () => {
        if (!input.trim() || !username || !sessionId) return;
        socket.emit("chat message", { content: input });
        setInput("");
    };

    if (taskComplete) {
        return (
            <div className="app-container flex items-center justify-center">
                <p className="text-gray-500 italic">
                    This round is complete. Please wait for the next stage.
                </p>
            </div>
        );
    }

    return (
        <div className="app-container">
            {/* Messages area */}
            <div className="messages-container">
                {isTyping && (
                    <div className="italic text-gray-500 mt-2">
                        AI Agent is typing...
                    </div>
                )}
                <div className="typing-indicator">
                    {typingUsers.size > 0 && (
                        <span>
                            {[...typingUsers].join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                        </span>
                    )}
                </div>
                {messages.map((msg, i) => (
                    <div key={i} className="mb-2">
                        <strong>{msg.sender}: </strong>
                        <span>{msg.content}</span>
                        {msg.time && <span className="text-gray-400 ml-2">{msg.time}</span>}
                    </div>
                ))}
            </div>

            {/* Message input */}
            <div className="control-container">
                <div className="user-control">
                    {username && (
                        <div className={`mb-2 font-bold ${colourMap[username]}`}>
                            You are: {username}
                        </div>
                    )}
                    <input
                        type="text"
                        id="chat-input"
                        placeholder="Type a message..."
                        value={input}
                        onChange={handleInputChange}
                        className="message-input"
                        disabled={!username}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                </div>
                <div className="button-control">
                    <button
                        onClick={sendMessage}
                        className="send-message"
                        disabled={!username}
                    >
                        Send
                    </button>
                    <button
                        onClick={() => {
                            if (sessionId) {
                                window.open(`http://13.62.133.82:4000/transcript/${sessionId}`);
                            }
                        }}
                        className="download-button"
                    >
                        Download Transcript
                    </button>
                </div>
            </div>
        </div>
    );
}