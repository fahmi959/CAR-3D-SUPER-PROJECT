import "./index.css";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";
import { Physics } from "@react-three/cannon";
import { useState } from "react";

function App() {
  const [touchControls, setTouchControls] = useState({
    up: false,
    down: false,
    left: false,
    right: false,
    reset: false,
    camera: false
  });

  return (
    <>
      <Canvas>
        <Physics broadphase="SAP" gravity={[0, -2.6, 0]}>
          <Scene touchControls={touchControls} />
        </Physics>
      </Canvas>

      {/* Gamepad overlay */}
      <div style={{
        position: "absolute",
        bottom: 20,
        left: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 100
      }}>
        <button
          onTouchStart={() => setTouchControls(c => ({ ...c, up: true }))}
          onTouchEnd={() => setTouchControls(c => ({ ...c, up: false }))}
        >↑</button>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onTouchStart={() => setTouchControls(c => ({ ...c, left: true }))}
            onTouchEnd={() => setTouchControls(c => ({ ...c, left: false }))}
          >←</button>

          <button
            onTouchStart={() => setTouchControls(c => ({ ...c, down: true }))}
            onTouchEnd={() => setTouchControls(c => ({ ...c, down: false }))}
          >↓</button>

          <button
            onTouchStart={() => setTouchControls(c => ({ ...c, right: true }))}
            onTouchEnd={() => setTouchControls(c => ({ ...c, right: false }))}
          >→</button>
        </div>

        <button
          onTouchStart={() => setTouchControls(c => ({ ...c, reset: true }))}
          onTouchEnd={() => setTouchControls(c => ({ ...c, reset: false }))}
        >R</button>

        <button
          onTouchStart={() => setTouchControls(c => ({ ...c, camera: true }))}
          onTouchEnd={() => setTouchControls(c => ({ ...c, camera: false }))}
        >K</button>
      </div>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
