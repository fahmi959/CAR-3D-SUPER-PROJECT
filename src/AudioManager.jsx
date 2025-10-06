import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function AudioManager({ velocityRef }) {
  const engineRef = useRef(null);
  const bgmRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // Inisialisasi audio
    engineRef.current = new Audio(process.env.PUBLIC_URL + "/sounds/engine.mp3");
    engineRef.current.loop = true;
    engineRef.current.volume = 0.5;

    bgmRef.current = new Audio(process.env.PUBLIC_URL + "/sounds/bgm.mp3");
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.3;

    // Start audio setelah klik user
    const startAudio = () => {
      if (startedRef.current) return;
      bgmRef.current.play().catch(() => {});
      engineRef.current.play().catch(() => {});
      startedRef.current = true;
      window.removeEventListener("click", startAudio);
    };

    window.addEventListener("click", startAudio);

    return () => {
      engineRef.current?.pause();
      bgmRef.current?.pause();
      window.removeEventListener("click", startAudio);
    };
  }, []);

  // Update engine sound tiap frame
  useFrame(() => {
    if (!engineRef.current || !velocityRef?.current) return;

    const v = velocityRef.current;
    const speed = Math.sqrt(v[0] ** 2 + v[2] ** 2);

    engineRef.current.volume = Math.min(speed / 10, 1);
    engineRef.current.playbackRate = 0.5 + speed / 20;

    if (speed > 0 && engineRef.current.paused && startedRef.current) {
      engineRef.current.play().catch(() => {});
    }
    if (speed === 0 && !engineRef.current.paused) {
      engineRef.current.pause();
    }
  });

  return null;
}
