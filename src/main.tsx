import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "@/app";
import { captureError } from "@/shared/error-capture";

// Render the app
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement, {
    onUncaughtError: (error, errorInfo) => {
      captureError("frontend", error, {
        componentStack: errorInfo.componentStack,
      });
    },
    onCaughtError: (error, errorInfo) => {
      captureError("frontend", error, {
        componentStack: errorInfo.componentStack,
      });
    },
  });
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
