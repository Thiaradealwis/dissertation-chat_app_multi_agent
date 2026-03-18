import ConvergenceAgent from "./agents/ConvergenceAgent.js";
import EqualConsiderationAgent from "./agents/EqualConsiderationAgent.js";
import EqualParticipationAgent from "./agents/EqualParticipationAgent.js";
import GroupInfoSharingAgent from "./agents/GroupInfoSharingAgent.js";
import MediatorAgent from "./agents/MediatorAgent.js";

export const sessions = {}

export function createSession(sessionId, client) {
    const convergenceAgent = new ConvergenceAgent("convergence_agent", client);
    const equalConsiderationAgent = new EqualConsiderationAgent("equalConsiderationAgent", client);
    const equalParticipationAgent = new EqualParticipationAgent("equalParticipationAgent", client);
    const groupInfoSharingAgent = new GroupInfoSharingAgent("groupInfoSharingAgent", client);
    const mediatorAgent = new MediatorAgent("mediatorAgent", client);

    sessions[sessionId] = {
        participants: {},
        participantIDs: {},
        messages: [],
        summaries: [],
        messagesSinceLastIntervention: 0,
        observers: [convergenceAgent, equalConsiderationAgent, equalParticipationAgent, groupInfoSharingAgent],
        mediator: mediatorAgent,
        lastResponseId: null,
        lastHandledIndex: 0,
        scenario: null,
        mediatorOn: false,
        round: null
    };
    return sessions[sessionId];
}