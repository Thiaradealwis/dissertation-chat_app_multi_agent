import './MessagesContainer.css'

interface Message {
    sender: string;
    content: string;
    time?: string;
}

interface MessagesListProps {
    messages: Message[];
    typingUsers: Set<string>;
    isTyping: boolean;
}

export function MessagesContainer({ messages, typingUsers, isTyping }: MessagesListProps) {
    const participantColors = {
        Red: '#c75146',
        Orange: '#f2a65a',
        Green: '#70A37F',
        Yellow: '#F4D06F',
        Mediator: '#bbd1ea',
    };


    // @ts-ignore
    return (
        <div className="messages-container">
            {isTyping && (
                <div className="italic text-gray-500 mt-2">
                    Mediator is typing...
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

                <div key={i} className="message" style={{
                    backgroundColor: participantColors[msg.sender as keyof typeof participantColors],
                    padding: '4px 8px',
                    margin: '2px 0',
                    borderRadius: '4px'
                }}>
                    <strong>{msg.sender}: </strong>
                    <span>{msg.content}</span>
                    {msg.time && <span className="text-gray-400 ml-2">{msg.time}</span>}
                </div>
            ))}

        </div>
    )
}