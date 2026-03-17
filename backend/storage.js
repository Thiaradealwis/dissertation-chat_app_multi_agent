import fs from "fs";

if (!fs.existsSync('sessions')) {
    fs.mkdirSync('sessions');
}


export function saveMessage(sessionKey, session, message) {
    const filePath = `sessions/${sessionKey}.json`;

    let data;
    try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        data = {
            sessionKey,
            groupID: sessionKey.split('-round')[0],
            round: session.round,
            scenario: session.scenario,
            mediatorOn: session.mediatorOn,
            participants: { ...session.participantIDs },
            startedAt: new Date().toISOString(),
            messages: []
        };
    }

    data.messages.push({
        sender: message.sender,
        content: message.content,
        timestamp: message.timestamp
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}