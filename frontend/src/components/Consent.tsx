import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export default function ConsentPage() {
    const navigate = useNavigate();

    // Generate or retrieve participant ID
    useEffect(() => {
        let participantId = localStorage.getItem("participantId");
        if (!participantId) {
            participantId = uuidv4();
            localStorage.setItem("participantId", participantId);
        }
    }, []);

    const participantId = localStorage.getItem("participantId");

    const handleNext = () => {
        // Optional: you could verify Typeform completion via API here
        navigate("/waiting-room?participantId=${participantId}");
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Welcome to the Study</h1>
            <p>
                Please read the consent information and complete the pre-task survey.
            </p>

            <iframe
                src={`https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=MH_ksn3NTkql2rGM8aQVG-tihBA1rupNjYA3OGj3xU1UME1PTkMyQ1FLQ1pPWU1CWU1RNzA3Tlc2TC4u&participantId=${participantId}`}
                width="640"
                height="800"
                frameBorder="0"
                scrolling="no"
                style={{width: "100%", maxWidth: "800px", minHeight: "600px"}}
                title="Consent Form"
            ></iframe>

            <button
                onClick={handleNext}
                style={{marginTop: "20px", padding: "10px 20px", fontSize: "16px"}}
            >
                Next
            </button>

            <p style={{marginTop: "20px", fontStyle: "italic"}}>
                After clicking Next, you will enter the waiting room.
            </p>
        </div>
    );
}