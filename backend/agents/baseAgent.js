export default class Agent {
    constructor(id, client, model = "gpt-5-mini") {
        if (!client) throw new Error(`Client not provided to agent ${id}`);
        this.id = id;
        this.client = client;
        this.model = model;
        this.lastResponseId = null;
    }

    async generate(newMessages) {
        let response;
        if (!this.client) {
            throw new Error(`Client is undefined in agent ${this.id}`);
        }

        if (!this.lastResponseId) {
            response = await this.client.responses.create({
                model: this.model,
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
                model: this.model,
                previous_response_id: this.lastResponseId,
                input: newMessages
            })
        }
        this.lastResponseId = response.id;
        return response.output_text
    }
}
