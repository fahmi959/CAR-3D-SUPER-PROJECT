import { useBox, useRaycastVehicle } from "@react-three/cannon";
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useControls } from "./useControls";
import { useWheels } from "./useWheels";
import { WheelDebug } from "./WheelDebug";
import AudioManager from "./AudioManager";

export function Car({ thirdPerson, touchControls }) {
  let result = useLoader(GLTFLoader, process.env.PUBLIC_URL + "/models/car.glb").scene;

  const position = [-1.5, 0.5, 3];
  const width = 0.15;
  const height = 0.07;
  const front = 0.15;
  const wheelRadius = 0.05;
  const chassisBodyArgs = [width, height, front * 2];

  const [chassisBody, chassisApi] = useBox(
    () => ({ allowSleep: false, args: chassisBodyArgs, mass: 150, position }),
    useRef(null)
  );

  const [wheels, wheelInfos] = useWheels(width, height, front, wheelRadius);
  const [vehicle, vehicleApi] = useRaycastVehicle(
    () => ({ chassisBody, wheelInfos, wheels }),
    useRef(null)
  );

  useControls(vehicleApi, chassisApi, touchControls);

  const velocity = useRef([0, 0, 0]);
  useEffect(() => {
    const unsub = chassisApi.velocity.subscribe((v) => (velocity.current = v));
    return unsub;
  }, []);

  // Third person camera
  useFrame((state) => {
    if (!thirdPerson) return;
    const pos = new Vector3();
    pos.setFromMatrixPosition(chassisBody.current.matrixWorld);
    const quat = new Quaternion();
    quat.setFromRotationMatrix(chassisBody.current.matrixWorld);
    const wDir = new Vector3(0, 0, 1).applyQuaternion(quat).normalize();
    const camPos = pos.clone().add(wDir.clone().multiplyScalar(1).add(new Vector3(0, 0.3, 0)));
    state.camera.position.copy(camPos);
    state.camera.lookAt(pos);
  });

  useEffect(() => {
    if (!result) return;
    result.scale.set(0.0012, 0.0012, 0.0012);
    result.children[0].position.set(-365, -18, -67);
  }, [result]);

  return (
    <group ref={vehicle} name="vehicle">
      <group ref={chassisBody} name="chassisBody">
        <primitive object={result} rotation-y={Math.PI} position={[0, -0.09, 0]} />
      </group>
      {wheels.map((w, i) => <WheelDebug key={i} wheelRef={w} radius={wheelRadius} />)}
      <AudioManager velocityRef={velocity} />
    </group>
  );
}
