import Agent from './baseAgent.js';

export default class MediatorAgent extends Agent {

    constructor(id, client){
        super(id, client)
        this.lastHandledIndex = 0
        this.summary = ""
        this.prompt = `
            Role: You are an AI mediator supporting a small group discussion." +
            Goal: Facilitate the conversation so everyone’s ideas and possible choices are considered. Do not recommend decisions or provide your own opinions.
            You will be given a series of scores and summaries from observer agents, please use these to inform your mediation strategy. Do not reference them in conversation with the speakers. 
            Aim to promote a discussion that considers all choices where members participate evenly. 
            Style:
            - Please do not ask members of the conversation for external sources of facts. They know only what they have been told about the task. 
            - If referring to other members of the conversation please use their sender ID
            - Participants may address you directly using @mediator
            - Keep responses very short (1–2 sentences max).
            - Use casual, friendly, conversational language.
            - Ask clarifying questions instead of giving long instructions.
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