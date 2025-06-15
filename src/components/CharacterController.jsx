import { Billboard, CameraControls, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, vec3 } from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";
import { VRMAvatar } from "./VRMAvatar";
import * as THREE from "three";

const MOVEMENT_SPEED = 0.45; // Change this for movement speed
const JUMP_FORCE = 2; // Adjust this for jump height

export const CharacterController = ({
  avatar,
  cameraControls,
  ...props
}) => {
  const group = useRef();
  const character = useRef();
  const rigidbody = useRef();
  const keys = useRef({});
  const [isMoving, setIsMoving] = useState(false);
  const [isGrounded, setIsGrounded] = useState(true);
  const firstPersonCamera = useRef(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000));
  const { gl, scene } = useThree();
  const {isChatting, setIsChatting} = useThree();

  // Handle key presses
  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e) => {
      keys.current[e.key.toLowerCase()] = false;
    };
	

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  
  
const takeFirstPersonScreenshot = () => {
  if (!rigidbody.current) return;

  const position = rigidbody.current.translation();
  const rotation = rigidbody.current.rotation();

  // Eye level position
  const baseEye = new THREE.Vector3(position.x, position.y + 1.5, position.z);
  const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(rotation).normalize();

  // Move eye slightly forward (e.g., 0.2 units ahead)
  const eye = baseEye.clone().add(direction.clone().multiplyScalar(0.05));

  firstPersonCamera.current.position.copy(eye);
  firstPersonCamera.current.lookAt(baseEye.clone().add(direction));

  // Create a new WebGL render target
  const renderTarget = new THREE.WebGLRenderTarget(800, 600); // Adjust resolution as needed

  // Set up rendering to texture
  gl.setRenderTarget(renderTarget);
  gl.render(scene, firstPersonCamera.current);
  gl.setRenderTarget(null); // Reset back to screen rendering

  // Read pixels from the render target
  const pixels = new Uint8Array(800 * 600 * 4);
  gl.readRenderTargetPixels(renderTarget, 0, 0, 800, 600, pixels);

  // Create a canvas and draw the pixels to it
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(800, 600);

  // Flip Y and copy pixel data, also increase brightness
  const brightnessFactor = 1.2; // Adjust this value to increase/decrease brightness
  for (let y = 0; y < 600; y++) {
    for (let x = 0; x < 800; x++) {
      const i = (y * 800 + x) * 4;
      const j = ((599 - y) * 800 + x) * 4;

      // Get original pixel values
      let r = pixels[j];
      let g = pixels[j + 1];
      let b = pixels[j + 2];

      // Increase brightness by scaling the RGB values
      r = Math.min(255, r * brightnessFactor); // Ensure the values don't exceed 255
      g = Math.min(255, g * brightnessFactor);
      b = Math.min(255, b * brightnessFactor);

      // Apply the adjusted brightness to the image data
      imageData.data[i] = r;
      imageData.data[i + 1] = g;
      imageData.data[i + 2] = b;
      imageData.data[i + 3] = pixels[j + 3]; // Alpha remains the same
    }
  }

  ctx.putImageData(imageData, 0, 0);

// Open in new tab
const dataUrl = canvas.toDataURL("image/png");
const newTab = window.open();
newTab.document.write(`
  <html>
    <head>
      <style>
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: black;
        }
        img {
          display: block;
          width: 100vw;
          height: 100vh;
          object-fit: contain;
        }
      </style>
    </head>
    <body>
      <img src="${dataUrl}" />
    </body>
  </html>
`);
newTab.document.close();
};


  // Check if the character is grounded
  const checkGrounded = () => {
    const position = rigidbody.current.translation();
    // Check if the character is close enough to the ground (adjust this based on your setup)
    setIsGrounded(position.y <= 0.1);
  };

  // Handle movement, jumping, and rotation each frame
  useFrame(() => {
    if (!cameraControls?.current || !rigidbody.current) return;

    const camera = cameraControls.current.camera;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const speed = MOVEMENT_SPEED;

    const isMoving =
      keys.current["w"] || keys.current["a"] || keys.current["s"] || keys.current["d"];

    // Movement vector accumulator
    const moveVec = new THREE.Vector3();

    if (keys.current["w"]) {
      moveVec.add(direction);
    }

    if (keys.current["s"]) {
      moveVec.sub(direction);
    }

    if (keys.current["a"]) {
      const left = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
      moveVec.add(left);
    }

    if (keys.current["d"]) {
      const right = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
      moveVec.add(right);
    }

    if (isMoving && moveVec.lengthSq() > 0) {
      moveVec.normalize();

      // Apply rotation toward movement direction
      const angle = Math.atan2(moveVec.x, moveVec.z);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0));
      rigidbody.current.setRotation(q, true);

      // Apply impulse in that direction
      rigidbody.current.applyImpulse({
        x: moveVec.x * speed,
        y: 0,
        z: moveVec.z * speed,
      }, true);
    }

    // --- JUMPING ---
    if (keys.current[" "] && isGrounded) {
      rigidbody.current.applyImpulse({
        x: 0,
        y: JUMP_FORCE,
        z: 0,
      }, true);
      setIsGrounded(false); // Start the jump and assume we are not grounded until we check again
    }

    // --- CAMERA FOLLOW ---
const position = rigidbody.current.translation();
const offset = new THREE.Vector3();
camera.getWorldPosition(offset);
offset.sub(cameraControls.current._target);

cameraControls.current._target.set(position.x, position.y + 1.5, position.z);
cameraControls.current._needsUpdate = true;
camera.position.copy(cameraControls.current._target).add(offset);

if (keys.current["p"]) {
  takeFirstPersonScreenshot();
  keys.current["p"] = false;
}
    checkGrounded(); // Recheck if grounded every frame
  });

  return (
    <RigidBody
      ref={rigidbody}
      //position={[-5, -7.5, 3]}  // <--- spawn high in the air
      colliders={false}
      type="dynamic"
      friction={0}
      linearDamping={12}
      lockRotations
    >
      <group ref={group} {...props}>
        <VRMAvatar avatar={avatar} isMoving={isMoving} />
      </group>

      <CapsuleCollider args={[1.75, 0.3]} position={[0, 2, 0]} />
    </RigidBody>
  );
};
