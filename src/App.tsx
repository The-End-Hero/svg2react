import { HashRouter, Route, Routes } from "react-router";
import { MotionConfig } from "motion/react";
import { PostHogProvider } from "posthog-js/react";
import SvgConverter from "@/pages/svg-converter/SvgConverter.tsx";

const options = {
  api_host: "https://us.i.posthog.com",
};
const POSTHOG_KEY = "phc_ntG8O5d5pto5A9mRCMvFgKcnSjet92w73AzDq9nkoU4";

function App() {
  return (
    <HashRouter>
      <PostHogProvider apiKey={POSTHOG_KEY} options={options}>
        <MotionConfig reducedMotion="user">
          <Routes>
            <Route path="/" element={<SvgConverter />} />
          </Routes>
        </MotionConfig>
      </PostHogProvider>
    </HashRouter>
  );
}

export default App;
