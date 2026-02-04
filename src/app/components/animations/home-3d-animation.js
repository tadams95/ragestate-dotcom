'use client';

import { PointMaterial, Points } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

// ========== INTERACTION CONFIG (tune these!) ==========
const TRAIL_Z = 9; // Fixed z-position of trail particles (relative to camera at z=15)

// Wake trail settings
const TRAIL_SPAWN_RATE = 5; // Particles spawned per frame while moving
const TRAIL_LIFETIME = 2.0; // Seconds before trail particle fades
const TRAIL_MAX_PARTICLES = 150; // Max trail particles (ring buffer)
const TRAIL_SPREAD = 0.3; // Random spread from cursor position
// ======================================================

/**
 * Hook to track mouse/touch position normalized to -1 to 1 range
 * @returns {React.MutableRefObject<{x: number, y: number, active: boolean}>}
 */
function useMousePosition() {
  const mouse = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const handleMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouse.current.active = true;
    };

    const handleTouch = (e) => {
      if (e.touches.length > 0) {
        mouse.current.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouse.current.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
        mouse.current.active = true;
      }
    };

    const handleLeave = () => {
      mouse.current.active = false;
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });
    window.addEventListener('mouseleave', handleLeave);
    window.addEventListener('touchend', handleLeave);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('mouseleave', handleLeave);
      window.removeEventListener('touchend', handleLeave);
    };
  }, []);

  return mouse;
}

/**
 * Wake trail component - spawns temporary particles that fade behind cursor
 * @param {{mouse: React.MutableRefObject<{x: number, y: number, active: boolean}>, color: string, isDark: boolean}} props
 */
function WakeTrail({ mouse, color, isDark }) {
  const ref = useRef();
  const { viewport, camera } = useThree();

  /**
   * Convert normalized mouse coordinates (-1 to 1) to world position at TRAIL_Z depth
   * @param {number} normalizedX - Mouse X in -1 to 1 range
   * @param {number} normalizedY - Mouse Y in -1 to 1 range
   * @returns {{x: number, y: number}} World position
   */
  const getWorldPosition = (normalizedX, normalizedY) => {
    const distance = camera.position.z - TRAIL_Z;
    const vFov = (camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * viewport.aspect;
    return {
      x: (normalizedX * width) / 2,
      y: (normalizedY * height) / 2,
    };
  };

  const trailData = useRef({
    positions: new Float32Array(TRAIL_MAX_PARTICLES * 3),
    ages: new Float32Array(TRAIL_MAX_PARTICLES),
    head: 0,
    lastMouse: { x: 0, y: 0 },
  });

  // Initialize positions off-screen
  useMemo(() => {
    const positions = trailData.current.positions;
    for (let i = 0; i < TRAIL_MAX_PARTICLES; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100; // Off-screen
      positions[i * 3 + 2] = 0;
    }
  }, []);

  useFrame((state, delta) => {
    if (!ref.current?.geometry?.attributes?.position) return;

    const data = trailData.current;
    const positions = ref.current.geometry.attributes.position.array;
    const ages = data.ages;

    // Age existing particles - move them off-screen when expired
    for (let i = 0; i < TRAIL_MAX_PARTICLES; i++) {
      if (ages[i] > 0) {
        ages[i] -= delta;
        if (ages[i] <= 0) {
          positions[i * 3 + 1] = -100; // Move off-screen when faded
        }
      }
    }

    // Spawn new particles if mouse moved
    if (mouse.current.active) {
      const worldPos = getWorldPosition(mouse.current.x, mouse.current.y);
      const mx = worldPos.x;
      const my = worldPos.y;
      const moved =
        Math.abs(mx - data.lastMouse.x) > 0.05 || Math.abs(my - data.lastMouse.y) > 0.05;

      if (moved) {
        for (let j = 0; j < TRAIL_SPAWN_RATE; j++) {
          const idx = data.head;
          positions[idx * 3] = mx + (Math.random() - 0.5) * TRAIL_SPREAD;
          positions[idx * 3 + 1] = my + (Math.random() - 0.5) * TRAIL_SPREAD;
          positions[idx * 3 + 2] = TRAIL_Z;
          ages[idx] = TRAIL_LIFETIME;
          data.head = (data.head + 1) % TRAIL_MAX_PARTICLES;
        }
        data.lastMouse = { x: mx, y: my };
      }
    }

    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <Points ref={ref} positions={trailData.current.positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={isDark ? 0.14 : 0.16}
        sizeAttenuation={true}
        depthWrite={false}
        blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
        opacity={1.0}
      />
    </Points>
  );
}

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
      <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={color}
          size={isDark ? 0.05 : 0.06}
          sizeAttenuation={true}
          depthWrite={false}
          blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
          opacity={isDark ? 0.7 * intensity : 0.85 * intensity}
        />
      </Points>
    </group>
  );
}

// Scene component that receives background color and theme as props
function Scene({ color, intensity, particleCount, bgColor, isDark, enableBloom }) {
  const mouse = useMousePosition();

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 10, 25]} />
      <FloatingParticles
        color={color}
        intensity={intensity}
        count={particleCount}
        isDark={isDark}
      />
      <WakeTrail mouse={mouse} color={color} isDark={isDark} />

      {enableBloom && (
        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.4}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      )}
    </>
  );
}

export default function Home3DAnimation({ color = '#EF4E4E', intensity = 1 }) {
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
  const isMobile =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(max-width: 768px)').matches;
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) return null;

  const particleCount = isMobile ? 1500 : 3000;

  // Adjust particle color for light mode visibility
  // In light mode, use darker/more saturated colors
  const particleColor = isDark ? color : color === '#EF4E4E' ? '#b91c1c' : '#1d4ed8';

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
          enableBloom={!isMobile}
        />
      </Canvas>
    </div>
  );
}
