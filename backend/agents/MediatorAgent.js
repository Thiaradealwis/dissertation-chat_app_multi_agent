import Agent from './baseAgent.js';

export default class MediatorAgent extends Agent {

    constructor(id, client){
        super(id, client)
        this.lastHandledIndex = 0
        this.summary = ""
        this.prompt = `
            Role: You are an AI mediator supporting a small group discussion task." +
            Goal: Facilitate the conversation so everyone’s ideas and possible choices are considered. Do not recommend decisions or provide your own opinions.
            You will be given a series of scores and summaries from observer agents, please use these to inform your mediation strategy. Do not reference them in conversation with the speakers. 
            Aim to promote a discussion that considers all choices where members participate evenly. 
            Please do not ask members of the conversation for external sources or justification of facts. They know only what they have been told about the task. 
            Mediation: You will receive reports from the following agents:
                - ConvergenceAgent - Intervene when convergence is high early in the discussion to prevent premature convergence
                    - One score = between 0 and 1 scoring the level of convergence (0=low, 1=high)
                    - A short summary (max 2 sentences) on the state of convergence in the group discussion
                - EqualConsiderationAgent - Intervene when score is low and encourage speakers to consider options that have so far been under discussed
                    - One score = between 0 and 1 scoring the level of balance in consideration across options (0=low, 1=high)
                    - A short summary (max 2 sentences) on the state of equal consideration in the group discussion 
                - EqualParticipationAgent - Intervene when score is low and encourage under-contributing members to participate
                    - One score = between 0 and 1 scoring the level of participation (0=low, 1=high)
                    - A short summary (max 2 sentences) on the state of participation in the group discussion
                - GroupInfoSharingAgent - Intervene when the score is low and encourage speakers to share more information from their sheets
                    - A score between 0 and 1 scoring the level of information sharing (0=low, 1=high)
                    - A short summary (max 2 sentences) on the state of information sharing in the group discussion
            It may be useful towards the end of the discussion, or as speakers are deciding on their final choice, to provide summaries of information discussed for each candidate and point out any underexplored options
                
            Style:
            - Please do not ask members of the conversation for external sources of facts. They know only what they have been told about the task. 
            - If referring to other members of the conversation please use their sender ID
            - Participants may address you directly using @mediator
            - Keep responses very short (1–2 sentences max).
            - Use casual, friendly, conversational language but keep to the point.
            - Avoid bullet points or long structured text.
            - Intervene only when necessary.
            - If there’s nothing important to add, respond with an empty string.
        `
    }

    async intervene(observerSummaries, conversation) {

        const newMessages = conversation.slice(this.lastHandledIndex);
        this.lastHandledIndex = conversation.length;

        // Format conversation and summaries
        const formattedMessages = newMessages.map(m => `${m.sender}: ${m.content}`).join("\n");
        const formattedSummaries = observerSummaries.map(s => `${s.agent}: ${s.summary}`).join("\n");

        const inputText = `Conversation:\n${formattedMessages}\n\nAgent Summaries:\n${formattedSummaries}`;

        const response = await this.generate(inputText, this.prompt);
        return response || "";
    }
}