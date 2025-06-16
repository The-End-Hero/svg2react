import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
// import Home from "@/pages/home/Home.tsx";
import "./App.css";
// import Login from "@/pages/login/Login.tsx";
import { AnimatePresence } from "motion/react";
import SvgConverter from "@/pages/svg-converter/SvgConverter.tsx";
import { PostHogProvider } from "posthog-js/react";

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
const options = {
  api_host: "https://us.i.posthog.com",
};
const POSTHOG_KEY = "phc_ntG8O5d5pto5A9mRCMvFgKcnSjet92w73AzDq9nkoU4";
// Separate component to use hooks inside HashRouter
function AppContent() {
  const location = useLocation();

  return (
    <PostHogProvider apiKey={POSTHOG_KEY} options={options}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<SvgConverter />} />
          {/*<Route path="/login" element={<Login />} />*/}
          {/*<Route path="/svg-converter" element={<SvgConverter />} />*/}
        </Routes>
      </AnimatePresence>
    </PostHogProvider>
  );
}

export default App;
