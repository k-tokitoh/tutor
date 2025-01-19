import { useEffect, useState } from "react";
import { default as liff } from "@line/liff";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<
    Awaited<ReturnType<typeof liff.getProfile>> | undefined
  >(undefined);

  useEffect(() => {
    liff
      .init({
        liffId: import.meta.env.VITE_LIFF_ID,
      })
      .then(() => {
        setMessage("LIFF init succeeded.");
        return liff.getProfile();
      })
      .then((profile) => setProfile(profile))
      .catch((e: Error) => {
        setMessage("LIFF init failed.");
        setError(`${e}`);
      });
  }, []);

  return (
    <>
      <div className="App">
        <h1>create-liff-app</h1>
        {message && <p>{message}</p>}
        {error && (
          <p>
            <code>{error}</code>
          </p>
        )}
        <a
          href="https://developers.line.biz/ja/docs/liff/"
          target="_blank"
          rel="noreferrer"
        >
          LIFF Documentation
        </a>
      </div>
      <div>
        <ul>
          <li>userId: {profile?.userId ?? "-"}</li>
          <li>displayName: {profile?.displayName ?? "-"}</li>
          <li>statusMessage: {profile?.statusMessage ?? "-"}</li>
          <li>pictureUrl: {profile?.pictureUrl ?? "-"}</li>
        </ul>
      </div>
      <div>path: {window.location.pathname}</div>
    </>
  );
}

export default App;
