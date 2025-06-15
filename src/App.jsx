import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { CameraWidget } from "./components/CameraWidget";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { Physics} from "@react-three/rapier"
import * as THREE from "three";

// Set gravity to a stronger value (e.g., -30 for a more realistic gravity effect)
const gravity = new THREE.Vector3(0, -30, 0);

function App() {
  return (
    <>
      <UI />
      <CameraWidget />
      <Loader />
      <Canvas shadows camera={{ position: [0.25, 0.25, 2], fov: 30 }}>
        <color attach="background" args={["#333"]} />
        <fog attach="fog" args={["#333", 1000, 2000]} />
        {/* <Stats /> */}
        <Suspense>
		  <Physics gravity={gravity}>
        <Experience />
		  </Physics>
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
