import Agent from './baseAgent.js';

export default class GroupInfoSharingAgent extends Agent {

    constructor(id, client){
        super(id, client)
        this.lastHandledIndex = 0
        this.summary = ""
        this.prompt = `
            You are an observer listening in on a small group discussion.
            Your job is to track the conversation for the metrics below and return a summary to be used by a mediator agent. 
            
            Identify:
            - Based on current and previous messages, observe the level of new information facts shared by speakers. These are facts mentioned for the first time.
            
            Return:
            - A score between 0 and 1 scoring the level of information sharing (0=low, 1=high)
            - A short summary (max 2 sentences) on the state of information sharing in the group discussion           
        
        e.g. [Score: 0.1, Summary: Most participants are expressing personal opinions rather than introducing new information or evidence. Only Red referenced that the candidate was regarded as arrogant, which has not yet been discussed in detail by the group.]
        `
    }

    async observe(messages){
        const newMessages = messages.slice(this.lastHandledIndex)

        if (newMessages.length === 0) {
            return {
                agent: this.id,
                summary: this.summary || ""
            }
        }
        const formatted = newMessages
            .map(m => `${m.sender}: ${m.content}`)
            .join("\n")

        this.lastHandledIndex = messages.length

        const summary = await this.generate(formatted, this.prompt)
        this.summary = summary
        console.log(summary)

        return {
            agent: this.id,
            summary: summary
        }
    }
}