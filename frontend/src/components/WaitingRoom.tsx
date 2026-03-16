import { useEffect, useState } from "react";
import socket from "../socket";

export default function WaitingRoom() {
    const [count, setCount] = useState(0);
    const [participantId, setParticipantId] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const pid = params.get("participantId") || localStorage.getItem("participantId");
        setParticipantId(pid);

        if (!pid) return;
        // Join waiting room
        socket.emit("join-waiting-room", { socketId: socket.id, participantId });

        socket.on("waiting-count", (c: number) => setCount(c));
        socket.on("session-start", ({ sessionId }: { sessionId: string }) => {
            // Redirect to session page
            window.location.href = `/session?sessionId=${sessionId}`;
        });

        return () => {
            socket.off("waiting-count");
            socket.off("session-start");
        };
    }, [participantId]);

    return (
        <div style={{ textAlign: "center", marginTop: "100px" }}>
            <h2>Waiting Room</h2>
            <p>Waiting for {3 - count} more participant(s) to start the session...</p>
            <p>Current participants: {count}</p>
        </div>
    );
}