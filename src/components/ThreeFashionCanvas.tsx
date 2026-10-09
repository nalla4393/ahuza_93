import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Sun, Sparkles } from 'lucide-react';

interface ThreeFashionCanvasProps {
  mode: 'hero' | 'garment360' | 'whyAhuza';
  colorHex?: string;
  drapeType?: 'kurti' | 'frock' | 'kurta_dupatta' | 'lehenga' | 'night_suit' | 'track_suit' | 'mens_kurta';
  activeSceneIndex?: number;
  className?: string;
}

export const ThreeFashionCanvas: React.FC<ThreeFashionCanvasProps> = ({
  mode,
  colorHex = '#9A3412',
  drapeType = 'kurti',
  activeSceneIndex = 0,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [lightingPreset, setLightingPreset] = useState<'courtyard' | 'studio' | 'warm'>('courtyard');

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const colorHexRef = useRef(colorHex);
  colorHexRef.current = colorHex;

  const sceneIndexRef = useRef(activeSceneIndex);
  sceneIndexRef.current = activeSceneIndex;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const canvasEl = renderer.domElement;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglSupported(false);
    };
    const handleContextRestored = () => {
      setWebglSupported(true);
    };
    canvasEl.addEventListener('webglcontextlost', handleContextLost);
    canvasEl.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.2, mode === 'garment360' ? 4.4 : 5.2);

    // Three-Point Studio Lighting
    const ambientLight = new THREE.AmbientLight(
      lightingPreset === 'studio' ? 0xf8fafc : 0xfff7ed,
      lightingPreset === 'studio' ? 0.9 : 0.75
    );
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(
      lightingPreset === 'warm' ? 0xfdba74 : 0xfffbeb,
      lightingPreset === 'warm' ? 2.2 : 1.8
    );
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.85);
    fillLight.position.set(-4, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfed7aa, 1.3);
    rimLight.position.set(0, -3, -4);
    scene.add(rimLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Build mode-specific 3D objects
    let fabricGeo: THREE.PlaneGeometry | null = null;
    let fabricBasePositions: Float32Array | null = null;
    let primaryMaterial: THREE.MeshPhysicalMaterial | null = null;
    let garmentGroup: THREE.Group | null = null;
    let particlesMesh: THREE.Points | null = null;

    primaryMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colorHexRef.current),
      roughness: 0.58,
      metalness: 0.06,
      clearcoat: 0.12,
      clearcoatRoughness: 0.5,
      side: THREE.DoubleSide,
    });

    const secondaryMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#E7E0D6'),
      roughness: 0.45,
      metalness: 0.1,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#D6C7B2'),
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });

    if (mode === 'hero' || mode === 'whyAhuza') {
      // Flowing 3D Handloom Fabric Ribbon
      fabricGeo = new THREE.PlaneGeometry(5.6, 3.2, 42, 26);
      fabricBasePositions = new Float32Array(fabricGeo.attributes.position.array);
      const fabricMesh = new THREE.Mesh(fabricGeo, primaryMaterial);
      fabricMesh.rotation.x = -0.28;
      fabricMesh.position.set(0.2, 0.1, -0.4);
      rootGroup.add(fabricMesh);

      const wireOverlay = new THREE.Mesh(fabricGeo, wireframeMaterial);
      wireOverlay.rotation.x = -0.28;
      wireOverlay.position.set(0.2, 0.12, -0.38);
      rootGroup.add(wireOverlay);

      // Rotating sculptural clothing form rings
      const ringGeo = new THREE.TorusGeometry(1.35, 0.018, 16, 90);
      const ringMesh = new THREE.Mesh(ringGeo, secondaryMaterial);
      ringMesh.rotation.x = Math.PI / 2.6;
      rootGroup.add(ringMesh);
    }

    if (mode === 'garment360' || mode === 'whyAhuza') {
      garmentGroup = new THREE.Group();
      if (mode === 'whyAhuza') {
        garmentGroup.scale.set(0.75, 0.75, 0.75);
        garmentGroup.position.set(0, 0.1, 0.5);
      }

      // Mannequin / Garment Silhouette Construction
      // 1. Neckline Collar Ring
      const collarGeo = new THREE.TorusGeometry(0.32, 0.045, 16, 48);
      const collarMesh = new THREE.Mesh(collarGeo, primaryMaterial);
      collarMesh.position.y = 1.12;
      collarMesh.rotation.x = Math.PI / 2;
      garmentGroup.add(collarMesh);

      // 2. Upper Bodice / Yoke
      const bodiceGeo = new THREE.CylinderGeometry(0.36, 0.44, 0.85, 36, 8, true);
      const bodiceMesh = new THREE.Mesh(bodiceGeo, primaryMaterial);
      bodiceMesh.position.y = 0.68;
      garmentGroup.add(bodiceMesh);

      // 3. Left & Right Sleeves
      const sleeveLen = drapeType === 'frock' || drapeType === 'lehenga' ? 0.55 : 0.78;
      const sleeveGeo = new THREE.CylinderGeometry(0.14, 0.18, sleeveLen, 24, 1, true);
      const leftSleeve = new THREE.Mesh(sleeveGeo, primaryMaterial);
      leftSleeve.position.set(-0.55, 0.78, 0);
      leftSleeve.rotation.z = 0.48;
      garmentGroup.add(leftSleeve);

      const rightSleeve = new THREE.Mesh(sleeveGeo, primaryMaterial);
      rightSleeve.position.set(0.55, 0.78, 0);
      rightSleeve.rotation.z = -0.48;
      garmentGroup.add(rightSleeve);

      // 4. Lower Silhouette (varies by drapeType)
      const flareBottom =
        drapeType === 'lehenga'
          ? 1.15
          : drapeType === 'frock'
          ? 0.92
          : drapeType === 'track_suit' || drapeType === 'night_suit'
          ? 0.48
          : 0.64;

      const skirtGeo = new THREE.CylinderGeometry(0.44, flareBottom, 1.55, 48, 12, true);
      // Add subtle vertical pleats to skirt/kurta flare
      const skirtPos = skirtGeo.attributes.position;
      for (let i = 0; i < skirtPos.count; i++) {
        const vx = skirtPos.getX(i);
        const vy = skirtPos.getY(i);
        const vz = skirtPos.getZ(i);
        const angle = Math.atan2(vz, vx);
        const pleatAmp = drapeType === 'lehenga' || drapeType === 'frock' ? 0.045 : 0.018;
        const factor = (0.78 - vy) * 0.5;
        const rBoost = Math.sin(angle * 16) * pleatAmp * Math.max(0, factor);
        skirtPos.setX(i, vx + Math.cos(angle) * rBoost);
        skirtPos.setZ(i, vz + Math.sin(angle) * rBoost);
      }
      skirtGeo.computeVertexNormals();

      const skirtMesh = new THREE.Mesh(skirtGeo, primaryMaterial);
      skirtMesh.position.y = -0.52;
      garmentGroup.add(skirtMesh);

      const skirtWire = new THREE.Mesh(skirtGeo, wireframeMaterial);
      skirtWire.position.y = -0.52;
      garmentGroup.add(skirtWire);

      // 5. Flowing Handloom Dupatta if kurta_dupatta or lehenga
      if (drapeType === 'kurta_dupatta' || drapeType === 'lehenga') {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.42, 1.08, 0.25),
          new THREE.Vector3(0.0, 0.55, 0.46),
          new THREE.Vector3(0.48, 0.98, 0.18),
          new THREE.Vector3(0.62, -0.35, -0.28),
          new THREE.Vector3(0.55, -1.1, -0.35),
        ]);
        const dupattaGeo = new THREE.TubeGeometry(curve, 64, 0.14, 12, false);
        const dupattaMesh = new THREE.Mesh(dupattaGeo, secondaryMaterial);
        garmentGroup.add(dupattaMesh);
      }

      // Studio Pedestal Base
      const baseGeo = new THREE.CylinderGeometry(0.95, 1.05, 0.08, 48);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0xe5dfd5, roughness: 0.7 });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = -1.45;
      garmentGroup.add(baseMesh);

      rootGroup.add(garmentGroup);
    }

    // Soft floating fabric particles
    const particleCount = 65;
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 7;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x9a3412,
      size: 0.045,
      transparent: true,
      opacity: 0.45,
    });
    particlesMesh = new THREE.Points(pGeo, pMat);
    scene.add(particlesMesh);

    // Interactive Drag & Pointer Parallax
    let isDragging = false;
    let prevX = 0;
    let userYaw = 0;
    let pointerX = 0;
    let pointerY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      pointerY = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      if (isDragging) {
        const dx = e.clientX - prevX;
        userYaw += dx * 0.012;
        prevX = e.clientX;
      }
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let animFrameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (primaryMaterial) {
        primaryMaterial.color.lerp(new THREE.Color(colorHexRef.current), 0.08);
      }

      if (!reducedMotion) {
        // Animate fabric wave vertices smoothly
        if (fabricGeo && fabricBasePositions) {
          const pos = fabricGeo.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            const bx = fabricBasePositions[i * 3];
            const by = fabricBasePositions[i * 3 + 1];
            const waveZ =
              Math.sin(bx * 1.1 + elapsed * 1.1) * 0.22 +
              Math.cos(by * 1.4 + elapsed * 0.85) * 0.14;
            pos.setZ(i, waveZ);
          }
          pos.needsUpdate = true;
        }

        if (garmentGroup) {
          if (autoRotateRef.current && !isDragging) {
            userYaw += 0.006;
          }
          garmentGroup.rotation.y = userYaw;
          garmentGroup.position.y = Math.sin(elapsed * 1.4) * 0.04;
        }

        if (particlesMesh) {
          particlesMesh.rotation.y = elapsed * 0.05;
        }

        // Smooth camera parallax
        const targetCamX = pointerX * 0.35 + (mode === 'whyAhuza' ? (sceneIndexRef.current - 1.5) * 0.25 : 0);
        const targetCamY = 0.2 - pointerY * 0.2;
        camera.position.x += (targetCamX - camera.position.x) * 0.05;
        camera.position.y += (targetCamY - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      canvasEl.removeEventListener('webglcontextlost', handleContextLost);
      canvasEl.removeEventListener('webglcontextrestored', handleContextRestored);
      renderer.dispose();
    };
  }, [mode, drapeType, reducedMotion, lightingPreset]);

  if (!webglSupported) {
    return (
      <div className={`flex flex-col items-center justify-center bg-[#EFECE6] p-8 text-center ${className}`}>
        <Sparkles className="w-8 h-8 text-[#9A3412] mb-2" />
        <p className="font-display text-xl text-[#18181B]">AHUZA 3D Atelier View</p>
        <p className="text-xs text-[#52525B] mt-1">Interactive 3D fabric preview gracefully adapted for your device.</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full select-none overflow-hidden ${className}`}>
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Interactive 3D Ahuza Fashion Viewport"
      />

      {mode === 'garment360' && (
        <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          <div className="bg-black/65 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-white/15">
            <span>Drag horizontally for 360° drape inspection</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-md p-1 rounded-lg border border-white/15">
            <button
              type="button"
              onClick={() => setAutoRotate((prev) => !prev)}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap ${
                autoRotate ? 'bg-white text-[#18181B]' : 'text-white/80 hover:text-white'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{autoRotate ? 'Spinning' : 'Spin'}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setLightingPreset((prev) =>
                  prev === 'courtyard' ? 'studio' : prev === 'studio' ? 'warm' : 'courtyard'
                )
              }
              className="px-2.5 py-1 rounded text-xs font-medium text-white/90 hover:text-white flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="capitalize">{lightingPreset} Light</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
