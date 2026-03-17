import { io } from "socket.io-client";

const params = new URLSearchParams(window.location.search);

const socket = io("https://13.62.133.82:4000", {
    query: {
        participantID: params.get("participantID"),
        groupID: params.get("groupID"),
        scenario: params.get("scenario"),
        mediator: params.get("mediator"),
        round: params.get("round")
    }
});

export default socket;