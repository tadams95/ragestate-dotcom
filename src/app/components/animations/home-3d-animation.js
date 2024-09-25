"use client"

import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PointMaterial, Points } from '@react-three/drei'
import * as random from 'maath/random/dist/maath-random.esm'

function FloatingCubes() {
  const ref = useRef()
  const sphere = random.inSphere(new Float32Array(5000), { radius: 1.5 })

  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / 10
    ref.current.rotation.y -= delta / 15
  })

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#ff3030"
          size={0.005}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  )
}

export default function Home3DAnimation() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <FloatingCubes />
      </Canvas>
    </div>
  )
}