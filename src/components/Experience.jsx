import { CameraControls, Environment, Gltf } from "@react-three/drei";
import { useControls } from "leva";
import { useRef } from "react";
import { VRMAvatar } from "./VRMAvatar";
import { Map } from "./Map";
import { CharacterController } from "./CharacterController";

export const Experience = () => {
  const controls = useRef();

  const { avatar } = useControls("VRM", {
    avatar: {
      value: "7667029464206216702.vrm",
      options: [
		    "7667029464206216702.vrm",
        "262410318834873893.vrm",
        "3682610047957415694.vrm",
        "3636451243928341470.vrm",
        "8087383217573817818.vrm",
      ],
    },
  });

  return (
    <>
      <CameraControls
        ref={controls}
        maxPolarAngle={Math.PI / 2}
        minDistance={1}
        maxDistance={10}
      />
      
      <Environment preset="sunset" />
      <directionalLight intensity={2} position={[10, 10, 5]} />
      <directionalLight intensity={1} position={[-10, 10, 5]} />
	  <directionalLight
            //ref={directionalLight}
            position={[25, 18, -25]}
            intensity={0.3}
            //castShadow={!downgradedPerformance} // Disable shadows on low-end devices
            shadow-camera-near={0}
            shadow-camera-far={100}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0001}
          />
      <group position-y={-1.25}>
	    
        <Map />
        <CharacterController avatar={avatar} cameraControls={controls} />
        
      </group>
    </>
  );
};
