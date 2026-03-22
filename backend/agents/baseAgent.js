export default class Agent {
    constructor(id, client) {
        if (!client) throw new Error(`Client not provided to agent ${id}`);
        this.id = id;
        this.client = client;
        this.lastResponseId = null;
    }

    async generate(newMessages) {
        let response;
        if (!this.client) {
            throw new Error(`Client is undefined in agent ${this.id}`);
        }

        if (!this.lastResponseId) {
            response = await this.client.responses.create({
                model: "gpt-5.4-mini",
                input: [
                    {
                        role: "system",
                        content: this.prompt
                    },
                    {
                        role: "user",
                        content: newMessages
                    }
                ]
            })
        } else {
            response = await this.client.responses.create({
                model: "gpt-5.4-mini",
                previous_response_id: this.lastResponseId,
                input: newMessages
            })
        }
        this.lastResponseId = response.id;
        return response.output_text
    }
}
