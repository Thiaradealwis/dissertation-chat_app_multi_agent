// aiIntervention.js
import { getTimestamp } from "./utils/getTimestamp.js";

export async function intervene(session, summaries, io, sessionId) {
    if (!session || !session.mediator) return null;

    io.to(sessionId).emit("ai-start");

    let mediatorResponse = "";
    try {
        mediatorResponse = await session.mediator.intervene(summaries, session.messages);
    } catch (err) {
        console.error("Error generating mediator response:", err);
    }

    io.to(sessionId).emit("ai-end");

    if (!mediatorResponse || mediatorResponse === "") return null;

    const aiMessage = {
        sender: "Mediator",
        content: mediatorResponse,
        timestamp: getTimestamp()
    };

    session.messages.push(aiMessage);
    io.to(sessionId).emit("chat message", aiMessage);

    session.mediator.lastHandledIndex = session.messages.length;

    return aiMessage;
}