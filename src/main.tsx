import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./hooks/usePushNotifications";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
