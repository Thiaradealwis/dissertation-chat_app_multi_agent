// components/ChatInput/ChatInput.tsx
import { type SetStateAction, type Dispatch, useRef } from "react";
import socket from "../socket";
import './InputControls.css'

interface ChatInputProps {
    input: string;
    setInput: Dispatch<SetStateAction<string>>;
    sessionId: string | null;
    username: string;
    isUserTyping: boolean;
    setIsUserTyping: Dispatch<SetStateAction<boolean>>;
    sendMessage: () => void;

}

export default function ChatInput({
                                      input,
                                      setInput,
                                      sessionId,
                                      username,
                                      isUserTyping,
                                      setIsUserTyping,
                                      sendMessage,

                                  }: ChatInputProps) {
    const typingTimeout = useRef<number | null>(null);



    const handleInputChange = (e: { target: { value: SetStateAction<string> } }) => {
        setInput(e.target.value);

        if (!isUserTyping) {
            setIsUserTyping(true);
            if (sessionId) {
                socket.emit("typing", { sessionId, username, isTyping: true });
            }
        }

        if (typingTimeout.current) clearTimeout(typingTimeout.current);

        typingTimeout.current = window.setTimeout(() => {
            setIsUserTyping(false);
            if (sessionId) {
                socket.emit("typing", { sessionId, username, isTyping: false });
            }
        }, 1000);
    };
    const participantColors = {
        Red: '#c75146',
        Orange: '#f2a65a',
        Green: '#70A37F',
        Yellow: '#F4D06F',
        Mediator: '#bbd1ea',
    };

    return (
        <div className="control-container">
            <div className="user-control">
                {username && (
                    <div className={`mb-2 font-bold `} style={{backgroundColor: participantColors[username as keyof typeof participantColors], padding: '4px 8px',
                        margin: '2px 0',
                        borderRadius: '4px'}}>
                        You are: {username}
                    </div>
                )}
                <input
                    type="text"
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
            </div>
        </div>
    );
}
