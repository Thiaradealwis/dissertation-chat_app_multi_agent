import { v4 as uuidv4 } from "uuid";
import ConvergenceAgent from "./agents/ConvergenceAgent.js";
import EqualConsiderationAgent from "./agents/EqualConsiderationAgent.js";
import EqualParticipationAgent from "./agents/EqualParticipationAgent.js";
import GroupInfoSharingAgent from "./agents/GroupInfoSharingAgent.js";
import MediatorAgent from "./agents/MediatorAgent.js";
import { client } from "./server.js"; // OpenAI client

export const sessions = {};
export const colours = ["Red", "Orange", "Green", "Yellow"];

export function createSession(sessionId) {
    const convergenceAgent = new ConvergenceAgent("convergence_agent", client);
    const equalConsiderationAgent = new EqualConsiderationAgent("equalConsiderationAgent", client);
    const equalParticipationAgent = new EqualParticipationAgent("equalParticipationAgent", client);
    const groupInfoSharingAgent = new GroupInfoSharingAgent("groupInfoSharingAgent", client);
    const mediatorAgent = new MediatorAgent("mediatorAgent", client);

    sessions[sessionId] = {
        participants: {},
        messages: [],
        messagesSinceLastIntervention: 0,
        observers: [convergenceAgent, equalConsiderationAgent, equalParticipationAgent, groupInfoSharingAgent],
        mediator: mediatorAgent,
        lastResponseId: null,
        lastHandledIndex: 0,
        active: true,
        mediatorActive: true,
        lastSummaries:[]
    };

    return sessions[sessionId];
}