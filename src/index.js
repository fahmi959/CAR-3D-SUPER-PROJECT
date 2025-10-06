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

  const buttonStyle = {
    width: 70,
    height: 70,
    borderRadius: "50%",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "monospace",        // <- monospace untuk simetris
    background: "rgba(0,0,0,0.5)",
    color: "white",
    border: "2px solid white",
    touchAction: "none",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  };

  return (
    <>
      <Canvas>
        <Physics broadphase="SAP" gravity={[0, -2.6, 0]}>
          <Scene touchControls={touchControls} />
        </Physics>
      </Canvas>

      {/* Tombol kiri bawah: belok kiri & kanan */}
      <div style={{
        position: "absolute",
        bottom: 20,
        left: 20,
        display: "flex",
        gap: 15,
        zIndex: 100
      }}>
        <button
          style={buttonStyle}
          onTouchStart={() => setTouchControls(c => ({ ...c, left: true }))}
          onTouchEnd={() => setTouchControls(c => ({ ...c, left: false }))}
        >{"\u25C0"}</button>
        <button
          style={buttonStyle}
          onTouchStart={() => setTouchControls(c => ({ ...c, right: true }))}
          onTouchEnd={() => setTouchControls(c => ({ ...c, right: false }))}
        >{"\u25B6"}</button>
      </div>

      {/* Tombol kanan bawah: maju & mundur */}
      <div style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        display: "flex",
        flexDirection: "column",
        gap: 15,
        zIndex: 100
      }}>
        <button
          style={buttonStyle}
          onTouchStart={() => setTouchControls(c => ({ ...c, up: true }))}
          onTouchEnd={() => setTouchControls(c => ({ ...c, up: false }))}
        >{"\u2191"}</button>
        <button
          style={buttonStyle}
          onTouchStart={() => setTouchControls(c => ({ ...c, down: true }))}
          onTouchEnd={() => setTouchControls(c => ({ ...c, down: false }))}
        >{"\u2193"}</button>
      </div>

      {/* Tombol tengah bawah: reset & swap kamera */}
      <div style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 20,
        zIndex: 100
      }}>
        <button
          style={buttonStyle}
          onTouchStart={() => setTouchControls(c => ({ ...c, reset: true }))}
          onTouchEnd={() => setTouchControls(c => ({ ...c, reset: false }))}
        >R</button>
        <button
          style={buttonStyle}
          onTouchStart={() => setTouchControls(c => ({ ...c, camera: true }))}
          onTouchEnd={() => setTouchControls(c => ({ ...c, camera: false }))}
        >K</button>
      </div>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
