import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import CursorCoordinates from "../components/CursorCoordinates";
import OrbitImages from "../components/OrbitImages";
import "./Landing.css";

const orbitImages = [
  "/wsoalogo.png",
  "/wsoalogo.png",
  "/wsoalogo.png",
  "/wsoalogo.png",
  "/wsoalogo.png",
  "/wsoalogo.png",
];

const BANNER_TEXT = "JOIN ALPHA";

const BETA_LAUNCH = new Date("2025-01-15T00:00:00Z").getTime();

function useUptime() {
  const [elapsed, setElapsed] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = Math.floor((now - BETA_LAUNCH) / 1000);
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
  const uptime = useUptime();
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
      <CursorCoordinates />
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
      <div className="landing-orbit">
        <OrbitImages
          images={orbitImages}
          shape="ellipse"
          radiusX={340}
          radiusY={80}
          rotation={-8}
          duration={30}
          itemSize={80}
          responsive={true}
          radius={160}
          direction="normal"
          fill
          showPath
          paused={false}
        />
      </div>
      <header className="landing-header">
        <h1 className="landing-brand">
          <img
            src="/wsoalogo.png"
            alt=""
            style={{
              height: "1em",
              verticalAlign: "-0.15em",
              marginRight: "0.4em",
            }}
          />
          WSOA
        </h1>
        <div className="landing-metrics">
          <div className="landing-metrics-row">
            <span className="landing-metrics-label">EPOCH 1 COUNTDOWN</span>
            <span className="landing-metrics-value">
              {pad(uptime.d)}:{pad(uptime.h)}:{pad(uptime.m)}:{pad(uptime.s)}
            </span>
          </div>
          <div className="landing-metrics-divider" />
          <div className="landing-metrics-row">
            <span className="landing-metrics-label">THROUGHPUT</span>
            <span className="landing-metrics-value">
              <span>12.4k req/s</span>
              <span>Peak 18.2k</span>
            </span>
          </div>
          <div className="landing-metrics-divider" />
          <div className="landing-metrics-row">
            <span className="landing-metrics-label">LATENCY</span>
            <span className="landing-metrics-value">
              <span>P99 42ms</span>
              <span>Avg 12ms</span>
            </span>
          </div>
          <div className="landing-metrics-divider" />
          <div className="landing-metrics-row">
            <span className="landing-metrics-label">STATUS</span>
            <span className="landing-metrics-value">Operational</span>
          </div>
        </div>
      </header>
      <main className="landing-main">
        <div className="landing-native">
          <img
            src="/monad-logo.png"
            alt="Monad"
            className="landing-monad-logo"
          />{" "}
        </div>
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
          <span className="landing-bracket">[ API GATEWAY ] (soon)</span>
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
