"use client"

import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PointMaterial, Points } from '@react-three/drei'
import * as THREE from 'three'

function FloatingParticles({ color = "#EF4E4E", intensity = 1 }) {
  const ref = useRef()
  
  // Generate particles that represent the two worlds
  const particles = useMemo(() => {
    const count = 2000
    const temp = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const radius = 5 + Math.random() * 10
      const y = (Math.random() - 0.5) * 20
      
      temp[i * 3] = Math.cos(theta) * radius
      temp[i * 3 + 1] = y
      temp[i * 3 + 2] = Math.sin(theta) * radius
    }
    
    return temp
  }, [])

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime()
    
    ref.current.rotation.y = time * 0.05
    
    // Update particle positions for a flowing effect
    for (let i = 0; i < particles.length; i += 3) {
      const i3 = i / 3
      
      // Create a flowing motion effect
      ref.current.geometry.attributes.position.array[i + 1] -= delta * 0.3 * (Math.sin(i3) * 0.5 + 0.5)
      
      // Reset particles that go too low
      if (ref.current.geometry.attributes.position.array[i + 1] < -10) {
        ref.current.geometry.attributes.position.array[i + 1] = 10
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group rotation={[0, 0, 0]}>
      <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={color}
          size={0.05}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.7 * intensity}
        />
      </Points>
    </group>
  )
}

export default function Home3DAnimation({ color = "#EF4E4E", intensity = 1 }) {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 10, 25]} />
        <FloatingParticles color={color} intensity={intensity} />
      </Canvas>
    </div>
  )
}