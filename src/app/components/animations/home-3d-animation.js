'use client';

import { PointMaterial, Points } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

function FloatingParticles({ color = '#EF4E4E', intensity = 1, count = 2000, isDark = true }) {
  const ref = useRef();

  // Generate particles that represent the two worlds
  // Using count in deps ensures buffer is recreated if count changes
  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 10;
      const y = (Math.random() - 0.5) * 20;

      temp[i * 3] = Math.cos(theta) * radius;
      temp[i * 3 + 1] = y;
      temp[i * 3 + 2] = Math.sin(theta) * radius;
    }

    return temp;
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current?.geometry?.attributes?.position) return;

    const time = state.clock.getElapsedTime();
    const positionArray = ref.current.geometry.attributes.position.array;
    const len = positionArray.length;

    ref.current.rotation.y = time * 0.05;

    // Update particle positions for a flowing effect
    for (let i = 0; i < len; i += 3) {
      const i3 = i / 3;

      // Create a flowing motion effect
      positionArray[i + 1] -= delta * 0.3 * (Math.sin(i3) * 0.5 + 0.5);

      // Reset particles that go too low
      if (positionArray[i + 1] < -10) {
        positionArray[i + 1] = 10;
      }
    }

    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group rotation={[0, 0, 0]}>
      <Points key={count} ref={ref} positions={particles} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={color}
          size={isDark ? 0.05 : 0.16}
          sizeAttenuation={true}
          depthWrite={false}
          blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
          opacity={isDark ? 0.7 * intensity : 1.0 * intensity}
        />
      </Points>
    </group>
  );
}

// Scene component that receives background color and theme as props
function Scene({ color, intensity, particleCount, bgColor, isDark }) {
  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, isDark ? 10 : 25, isDark ? 25 : 50]} />
      <FloatingParticles
        color={color}
        intensity={intensity}
        count={particleCount}
        isDark={isDark}
      />
    </>
  );
}

export default function Home3DAnimation({ intensity = 1 }) {
  // Track theme for background color and particle styling
  const [bgColor, setBgColor] = useState('#000000');
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Get initial background color from CSS variable
    const updateTheme = () => {
      const rootStyles = getComputedStyle(document.documentElement);
      const cssColor = rootStyles.getPropertyValue('--bg-root').trim();
      const darkMode = document.documentElement.classList.contains('dark');

      setBgColor(cssColor || '#000000');
      setIsDark(darkMode);
    };

    updateTheme();

    // Listen for theme changes via MutationObserver on html class
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  // Prefer fewer particles on smaller screens and for users who prefer reduced motion
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  if (prefersReducedMotion) return null;

  const particleCount = isMobile ? 1500 : 3000;

  // Fixed red color - brand accent for light mode visibility
  const particleColor = isDark ? '#EF4E4E' : '#ff1f42';

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: 'low-power', antialias: false }}
      >
        <Scene
          color={particleColor}
          intensity={intensity}
          particleCount={particleCount}
          bgColor={bgColor}
          isDark={isDark}
        />
      </Canvas>
    </div>
  );
}
