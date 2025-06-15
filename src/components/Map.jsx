import { RigidBody } from "@react-three/rapier";
import { useEffect, useState, useCallback, useRef } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { clone } from "three/examples/jsm/utils/SkeletonUtils";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";

const gltfCache = {};

const loadGLTF = async (name) => {
  if (gltfCache[name]) return gltfCache[name];
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(`models/${name}.glb`);
  gltfCache[name] = gltf;
  return gltf;
};

const RaycastClickHandler = ({ objects, onSelect }) => {
  const { camera, gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  useEffect(() => {
    const handleClick = (event) => {
      const { left, top, width, height } = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - left) / width) * 2 - 1;
      mouse.current.y = -((event.clientY - top) / height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        let clicked = intersects[0].object;
        let root = clicked;

        while (root.parent) {
          if (root.userData?.isTopLevel) break;
          root = root.parent;
        }

        onSelect?.(root);
      }
    };

    gl.domElement.addEventListener("click", handleClick);
    return () => gl.domElement.removeEventListener("click", handleClick);
  }, [camera, gl, scene, objects, onSelect]);

  return null;
};

export const Map = () => {
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);

  const spawn = useCallback(async (name, position = [0, 0, 0], options = {}) => {
    try {
      const gltf = await loadGLTF(name);
      const instance = clone(gltf.scene);
      instance.position.set(...position);

      instance.name = name;
      instance.userData.isTopLevel = true;
      instance.userData.modelName = name;

      if (options.scale) {
        const [sx, sy, sz] = Array.isArray(options.scale)
          ? options.scale
          : [options.scale, options.scale, options.scale];
        instance.scale.set(sx, sy, sz);
      }

      setObjects((prev) => [
        ...prev,
        { id: crypto.randomUUID(), object: instance, position, options },
      ]);
    } catch (e) {
      console.error("Failed to spawn:", name, e);
    }
  }, []);

  const spawnMeshObject = useCallback(
    (geometry, material, position = [0, 0, 0], options = {}) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.name = "CustomBox";
      mesh.userData.isTopLevel = true;
      mesh.userData.modelName = "CustomBox";

      setObjects((prev) => [
        ...prev,
        { id: crypto.randomUUID(), object: mesh, position, options },
      ]);
    },
    []
  );

  useEffect(() => {
    (async () => {
      await spawn("Another_bedroom", [11, -9, 9], {
        withPhysics: true,
        type: "fixed",
        scale: [0.75, 0.75, 0.75],
      });
      await spawn("lop", [10, -9, 30], {
        withPhysics: true,
        type: "fixed",
        scale: [0.25, 0.25, 0.25],
      });

      spawnMeshObject(
        new THREE.BoxGeometry(100, 1, 100),
        new THREE.MeshStandardMaterial({ visible: true }),
        [0, -9.4, 0],
        {
          withPhysics: true,
          type: "fixed",
          collider: "cuboid",
        }
      );
    })();
  }, [spawn, spawnMeshObject]);

  return (
    <>
      {objects.map(({ id, object, options }) => {
        const primitive = <primitive key={id} object={object} />;
        if (options.withPhysics) {
          return (
            <RigidBody
              key={id}
              colliders={options.colliders || "trimesh"}
              type={options.type || "dynamic"}
            >
              {primitive}
            </RigidBody>
          );
        } else {
          return primitive;
        }
      })}

      <RaycastClickHandler objects={objects} onSelect={setSelectedObject} />

    </>
  );
};
