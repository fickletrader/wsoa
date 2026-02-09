import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";

const BANNER_TEXT = "JOIN ALPHA";

const PHASE2_DAYS_FROM_NOW = 7;

function usePhase2Countdown() {
  const [left, setLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const targetRef = useRef<number | null>(null);

  useEffect(() => {
    if (targetRef.current === null) {
      const inSevenDays = new Date();
      inSevenDays.setDate(inSevenDays.getDate() + PHASE2_DAYS_FROM_NOW);
      inSevenDays.setHours(0, 0, 0, 0);
      targetRef.current = inSevenDays.getTime();
    }
    const target = targetRef.current;

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setLeft({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function BannerSegment({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span key={i}>{BANNER_TEXT}</span>
      ))}
    </>
  );
}

export default function Landing() {
  const { d, h, m, s } = usePhase2Countdown();
  const segmentRef = useRef<HTMLDivElement>(null);
  const [segmentWidth, setSegmentWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = segmentRef.current;
    if (!el) return;
    const measure = () => setSegmentWidth(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="landing">
      <div className="landing-banner" aria-hidden>
        <div
          className={`landing-banner-track${
            segmentWidth !== null ? " landing-banner-track--ready" : ""
          }`}
          style={
            segmentWidth !== null
              ? { ["--banner-segment-width" as string]: `${segmentWidth}px` }
              : undefined
          }
        >
          <div ref={segmentRef} className="landing-banner-segment">
            <BannerSegment count={20} />
          </div>
          <div className="landing-banner-segment" aria-hidden>
            <BannerSegment count={20} />
          </div>
        </div>
      </div>
      <div className="landing-grain" aria-hidden />
      <header className="landing-header">
        <h1 className="landing-brand">WSOA</h1>
        <div className="landing-countdown-panel">
          <div className="landing-countdown-label">TIME TO PHASE 2</div>
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
