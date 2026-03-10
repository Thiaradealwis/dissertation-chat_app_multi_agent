import Agent from './baseAgent.js';

export default class ConvergenceAgent extends Agent {

    constructor(id, client){
        super(id, client)
        this.lastHandledIndex = 0
        this.summary = ""
        this.prompt = `
            You are an observer listening in on a small group discussion.
            Your job is to track the conversation for the metrics below and return a summary to be used by a mediator agent. 
            
            Identify:
            - Based on current and previous messages, observe the level of convergence between speakers. Convergence is measured by level of agreement between speakers on an option to choose.
            
            Return:
            - One score = between 0 and 1 scoring the level of convergence (0=low, 1=high)
            - A short summary (max 2 sentences) on the state of convergence in the group discussion 
            
            e.g. [Score: 0.9, Summary: The group has only discussed option B and all agree it is the best option. No members have suggested another option.]
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