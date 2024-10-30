"use client";

import React, { useRef, useEffect } from "react";
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from "three";

extend({ OrbitControls });

function RotatingSphere() {
  const ref = useRef();
  const texture = new THREE.TextureLoader().load("/assets/RAGESTATE.png");
  const sphere = new THREE.SphereGeometry(1.5, 32, 32);

  useFrame((state, delta) => {
    ref.current.rotation.y -= delta / 2.5;
  });

  // The sphere is a group of two meshes: one with a texture and one wireframe

  return (
    <group ref={ref} position={[0, -0.05, 0]}>
      <mesh geometry={sphere}>
        <meshBasicMaterial map={texture} />
      </mesh>
      <mesh geometry={sphere}>
        <meshBasicMaterial color="#FFBDBD" wireframe={true} />
      </mesh>
    </group>
  );
}

function Controls() {
  const { camera, gl } = useThree();
  const controls = useRef();
  useFrame(() => controls.current.update());
  return <orbitControls ref={controls} args={[camera, gl.domElement]} />;
}

export default function World() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <RotatingSphere />
        <Controls />
      </Canvas>
    </div>
  );
}
