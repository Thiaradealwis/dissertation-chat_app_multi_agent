import fs from "fs";

if (!fs.existsSync('sessions')) {
    fs.mkdirSync('sessions');
}


export function saveMessage(sessionKey, session, message) {
    if (!fs.existsSync(`sessions/${sessionKey}`)) {
        fs.mkdirSync(`sessions/${sessionKey}`);
    }
    const filePath = `sessions/${sessionKey}/${sessionKey}text.json`;

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

export function saveSummaryReports(sessionKey, session, summaries){
    if (!fs.existsSync(`sessions/${sessionKey}`)) {
        fs.mkdirSync(`sessions/${sessionKey}`);
    }
    const summaryFilePath = `sessions/${sessionKey}/${sessionKey}reports.json`;

    let data;
    try {
        data = JSON.parse(fs.readFileSync(summaryFilePath, "utf8"));
    } catch {
        data = {
            sessionKey,
            groupID: sessionKey.split("-round")[0],
            round: session.round,
            scenario: session.scenario,
            mediatorOn: session.mediatorOn,
            participants: { ...session.participantIDs },
            startedAt: new Date().toISOString(),
            summaries: []
        };
    }

    if (!data.summaries) {
        data.summaries = [];
    }

    // Append new summaries (can be array or single object)
    if (Array.isArray(summaries)) {
        data.summaries.push(...summaries);
    } else {
        data.summaries.push(summaries);
    }

    fs.writeFileSync(summaryFilePath, JSON.stringify(session.summaries, null, 2));
}