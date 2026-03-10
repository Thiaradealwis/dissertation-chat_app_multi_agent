import Agent from './baseAgent.js';

export default class EqualConsiderationAgent extends Agent {

    constructor(id, client){
        super(id, client)
        this.lastHandledIndex = 0
        this.summary = ""
        this.prompt = `
            You are an observer listening in on a small group discussion.
            Your job is to track the conversation for the metrics below and return a summary to be used by a mediator agent. 
            
            Identify:
            - Based on current and previous messages, observe the amount the speakers consider each possible solution answer. Consideration can include new and repeated information as well as opinions and justification.
            
            Return:
            - One score = between 0 and 1 scoring the level of balance in consideration across options (0=low, 1=high)
            - A short summary (max 2 sentences) on the state of equal consideration in the group discussion 
            
            e.g. [Score: 0.3, Summary: Two of the possible choice options have been discussed, however option A has been discussed significantly more than option B - for which information was brought up but has not been repeated]
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