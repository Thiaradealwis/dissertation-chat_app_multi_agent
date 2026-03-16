import { Routes, Route } from "react-router-dom";
import ConsentPage from "./components/Consent";
import WaitingRoom from "./components/WaitingRoom";
import Chat from "./components/Chat";
import ModeratorPanel from "./components/Moderator";

function App() {
    return (
        <Routes>
            <Route path="/consent" element={<ConsentPage />} />
            <Route path="/waiting-room" element={<WaitingRoom />} />
            <Route path="/session" element={<Chat />} />
            <Route path="/moderator" element={<ModeratorPanel />} />
            <Route path="*" element={<ConsentPage />} /> {/* fallback */}
        </Routes>
    );
}

export default App;