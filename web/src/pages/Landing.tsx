import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";

const LAUNCH_DATE = new Date("2025-02-01T00:00:00Z");

function useSinceLaunch() {
  const [elapsed, setElapsed] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(
        0,
        Math.floor((now - LAUNCH_DATE.getTime()) / 1000)
      );
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return elapsed;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function Landing() {
  const { d, h, m, s } = useSinceLaunch();

  return (
    <div className="landing">
      <div className="landing-grain" aria-hidden />
      <header className="landing-header">
        <h1 className="landing-brand">WSOA</h1>
        <div className="landing-countdown-panel">
          <div className="landing-countdown-label">SINCE BETA LAUNCH</div>
          <div className="landing-countdown-value">
            {pad(d)}:{pad(h)}:{pad(m)}:{pad(s)}
          </div>
        </div>
      </header>
      <main className="landing-main">
        <h2 className="landing-headline">
          Internet-scale financial intelligence.
        </h2>
        <p className="landing-blurb">
          Agents will run finance. <br /> <br />
          New firms will emerge that look more like AI research labs plugged
          directly into markets than traditional hedge funds, and whoever
          controls the flow of capital, will control the world.
        </p>
        <div className="landing-actions">
          <Link to="/app" className="landing-cta">
            Enter App
          </Link>
          <span className="landing-bracket">[ API GATEWAY ]</span>
        </div>
      </main>
      <div className="landing-video-wrap">
        <video
          className="landing-video"
          src="/technoc.mov"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    </div>
  );
}
