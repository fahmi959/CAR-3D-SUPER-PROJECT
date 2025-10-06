import { Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import { Car } from "./Car";
import { Ground } from "./Ground";
import { Track } from "./Track";

export function Scene({ touchControls }) {
  const [thirdPerson, setThirdPerson] = useState(false);
  const [cameraPosition, setCameraPosition] = useState([-6, 3.9, 6.21]);

  // Set kamera berdasarkan touchControls.camera
  useEffect(() => {
    if (touchControls.camera) {
      if (thirdPerson) setCameraPosition([-6, 3.9, 6.21 + Math.random() * 0.01]);
      setThirdPerson(prev => !prev);
    }
  }, [touchControls.camera]); // <-- dependency touchControls.camera

  return (
    <Suspense fallback={null}>
      <Environment
        files={process.env.PUBLIC_URL + "/textures/envmap.hdr"}
        background={"both"}
      />
      <PerspectiveCamera makeDefault position={cameraPosition} fov={40} />
      {!thirdPerson && <OrbitControls target={[-2.64, -0.71, 0.03]} />}
      <Ground />
      <Track />
      <Car thirdPerson={thirdPerson} touchControls={touchControls} />
    </Suspense>
  );
}

