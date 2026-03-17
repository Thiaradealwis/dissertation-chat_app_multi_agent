import dotenv from "dotenv";
import AWS from "aws-sdk";

dotenv.config();
AWS.config.update({ region: "eu-north-1" });
const secretsClient = new AWS.SecretsManager();

export const AI_RESPONSE_THRESHOLD = 6;
export const colours = ["Red", "Blue", "Green", "Yellow"];

export async function getOpenAIKey() {
    if (process.env.OPENAI_API_KEY) {
        console.log("Using OpenAI key from .env");
        return process.env.OPENAI_API_KEY;
    }

    const data = await secretsClient.getSecretValue({
        SecretId: "openAI_key"
    }).promise();

    if ("SecretString" in data) {
        const secret = JSON.parse(data.SecretString);
        return secret["Key: OPENAI_API_KEY"].replace("Value: ", "");
    } else {
        throw new Error("Secret binary format not supported");
    }
}

export function getTimestamp() {
    return new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
    });
}