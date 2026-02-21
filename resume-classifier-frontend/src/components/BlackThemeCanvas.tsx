import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// --- TEXTURE GENERATION ---
const getGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
};

// Procedurally generate planet surface textures
const getPlanetTexture = (planetName: string, baseColor: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256; // 2:1 aspect for sphere mapping
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Fill base
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 256);

    switch (planetName) {
        case 'Mercury': // Craters / Noise
        case 'Mars':
            for (let i = 0; i < 400; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 256;
                const r = Math.random() * 10;
                ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'Venus': // Thick Clouds (Swirly)
            // Simple gradient overlay
            const grad = ctx.createLinearGradient(0, 0, 0, 256);
            grad.addColorStop(0, "rgba(255,255,255,0.1)");
            grad.addColorStop(0.5, "rgba(255,255,0,0.1)");
            grad.addColorStop(1, "rgba(255,255,255,0.1)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 512, 256);
            break;
        case 'Earth': // Blue + Green Continents
            ctx.fillStyle = "#22c55e"; // Green
            for (let i = 0; i < 20; i++) {
                // Random lumps for continents
                const x = Math.random() * 512;
                const y = Math.random() * 256;
                const r = Math.random() * 60 + 20;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'Jupiter': // Bands
        case 'Saturn':
            // Horizontal Stripes
            for (let i = 0; i < 256; i += 10) {
                ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
                ctx.fillRect(0, i, 512, 10 + Math.random() * 5);

                // Accent stripes
                if (Math.random() > 0.7) {
                    ctx.fillStyle = planetName === 'Jupiter' ? 'rgba(200, 50, 0, 0.1)' : 'rgba(200, 200, 100, 0.1)';
                    ctx.fillRect(0, i, 512, 5);
                }
            }
            // Great Red Spot for Jupiter
            if (planetName === 'Jupiter') {
                ctx.fillStyle = 'rgba(180, 40, 0, 0.6)';
                ctx.beginPath();
                ctx.ellipse(300, 150, 40, 20, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'Uranus': // Featureless Haze
        case 'Neptune':
            // Slight vertical gradient
            const atmosphereState = ctx.createLinearGradient(0, 0, 0, 256);
            atmosphereState.addColorStop(0, "rgba(255,255,255,0.1)");
            atmosphereState.addColorStop(1, "rgba(0,0,0,0.1)");
            ctx.fillStyle = atmosphereState;
            ctx.fillRect(0, 0, 512, 256);
            break;
    }

    return new THREE.CanvasTexture(canvas);
}


// --- PLANET DATA ---
const PLANETS = [
    { name: 'Sun', radius: 1.5, distance: 0, color: '#fbbf24', speed: 0, type: 'Star' },
    { name: 'Mercury', radius: 0.25, distance: 2.5, color: '#a3a3a3', speed: 1.2, type: 'Terrestrial' }, // Grey
    { name: 'Venus', radius: 0.35, distance: 3.8, color: '#fcd34d', speed: 0.9, type: 'Terrestrial' }, // Yellow-ish
    { name: 'Earth', radius: 0.38, distance: 5.2, color: '#1d4ed8', speed: 0.7, type: 'Terrestrial' }, // Blue
    { name: 'Mars', radius: 0.3, distance: 7.0, color: '#ef4444', speed: 0.6, type: 'Terrestrial' }, // Red
    { name: 'Jupiter', radius: 1.1, distance: 10, color: '#d97706', speed: 0.4, type: 'Gas Giant' }, // Orange/Brown
    { name: 'Saturn', radius: 0.9, distance: 14, color: '#fcd34d', speed: 0.3, type: 'Gas Giant', hasRing: true, ringColor: '#ffeebb' }, // Gold
    { name: 'Uranus', radius: 0.6, distance: 17, color: '#22d3ee', speed: 0.2, type: 'Gas Giant' }, // Cyan
    { name: 'Neptune', radius: 0.6, distance: 20, color: '#3b82f6', speed: 0.15, type: 'Gas Giant' }, // Deep Blue
];

const PlanetRing = ({ radius, color }: { radius: number, color: string }) => {
    return (
        <mesh rotation={[Math.PI / 2.2, 0, 0]}> {/* Tilted Ring */}
            <ringGeometry args={[radius * 1.4, radius * 2.2, 64]} />
            <meshStandardMaterial
                color={color}
                side={THREE.DoubleSide}
                transparent
                opacity={0.6}
            />
        </mesh>
    );
}

const PlanetDustBody = ({ radius, color }: { radius: number, color: string }) => {
    const count = 1500;
    const mesh = useRef<THREE.Points>(null);
    const glowTexture = useMemo(() => getGlowTexture(), []);

    const particles = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const r = radius * 1.2 * Math.cbrt(Math.random()); // Slightly larger than planet

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            sizes[i] = Math.random() * 0.15 + 0.05;
        }
        return { positions, sizes };
    }, [radius]);

    useFrame(() => {
        if (mesh.current) {
            mesh.current.rotation.y -= 0.005;
        }
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={particles.positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial
                map={glowTexture}
                color={color}
                size={0.12}
                transparent
                opacity={0.6}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    )
}

const EllipticalOrbit = ({ xRadius, zRadius }: { xRadius: number, zRadius: number }) => {
    const points = useMemo(() => {
        const curve = new THREE.EllipseCurve(0, 0, xRadius, zRadius, 0, 2 * Math.PI, false, 0);
        return curve.getPoints(64);
    }, [xRadius, zRadius]);

    return (
        // @ts-ignore
        <line rotation={[Math.PI / 2, 0, 0]}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={points.length} array={new Float32Array(points.flatMap(p => [p.x, p.y, 0]))} itemSize={3} />
            </bufferGeometry>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.15} />
        </line>
    );
};

const Planet = ({ planet }: { planet: typeof PLANETS[0] }) => {
    const planetGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const glowTexture = useMemo(() => getGlowTexture(), []);
    const surfaceTexture = useMemo(() => getPlanetTexture(planet.name, planet.color), [planet.name, planet.color]);

    const isSun = planet.name === 'Sun';
    const xRadius = planet.distance;
    const zRadius = planet.distance * 0.8;

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime() * planet.speed * 0.1;

        // Move planet along ellipse
        if (planetGroupRef.current && !isSun) {
            planetGroupRef.current.position.x = xRadius * Math.cos(t);
            planetGroupRef.current.position.z = -zRadius * Math.sin(t); // Negative sin for CCW (Prograde)
        }

        // Spin the planet itself
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.005;
        }
    });

    return (
        <group>
            {/* Elliptical Orbits */}
            {!isSun && planet.distance > 0 && (
                <EllipticalOrbit xRadius={xRadius} zRadius={zRadius} />
            )}

            <group ref={planetGroupRef}>
                {/* 1. PLANET SURFACE */}
                <mesh ref={meshRef}>
                    <sphereGeometry args={[planet.radius, 64, 64]} />
                    <meshStandardMaterial
                        map={surfaceTexture}
                        color={isSun ? '#ffffff' : '#ffffff'} // Let texture handle color
                        emissive={isSun ? planet.color : '#000000'}
                        emissiveIntensity={isSun ? 4 : 0}
                        roughness={planet.type === 'Gas Giant' ? 0.4 : 0.7} // Gas is smoother
                        metalness={0.3} // More reflective for premium look
                    />
                </mesh>

                {/* 2. RINGS (Saturn/Uranus) */}
                {/* @ts-ignore */}
                {!isSun && (
                    <PlanetDustBody radius={planet.radius} color={planet.color} />
                )}

                {/* @ts-ignore */}
                {planet.hasRing && (
                    /* @ts-ignore */
                    <PlanetRing radius={planet.radius} color={planet.ringColor} />
                )}

                {/* 3. GLOW HALO: Sun Only */}
                {isSun && (
                    <sprite scale={[planet.radius * 8, planet.radius * 8, 1]}>
                        <spriteMaterial
                            map={glowTexture}
                            color={planet.color}
                            transparent
                            opacity={0.8}
                            blending={THREE.AdditiveBlending}
                        />
                    </sprite>
                )}
                {/* 3b. SECONDARY GLOW (Bloom) */}
                {isSun && (
                    <sprite scale={[planet.radius * 16, planet.radius * 16, 1]}>
                        <spriteMaterial
                            map={glowTexture}
                            color={planet.color}
                            transparent
                            opacity={0.3}
                            blending={THREE.AdditiveBlending}
                        />
                    </sprite>
                )}
            </group>
        </group>
    );
};

const SolarSystem = () => {
    return (
        <group position={[14, -5, 4]} rotation={[0.8, 0.5, 0]}>
            {/* CENTRAL LIGHT SOURCE */}
            <pointLight position={[0, 0, 0]} intensity={5} decay={2} distance={100} />
            <ambientLight intensity={0.1} />

            {PLANETS.map((planet) => (
                <Planet key={planet.name} planet={planet} />
            ))}
        </group>
    );
};

const CosmicDust = () => {
    const count = 8000;
    const points = useRef<THREE.Points>(null);
    const glowTexture = useMemo(() => getGlowTexture(), []);

    const particles = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const r = 40 + Math.random() * 60;
            const theta = 2 * Math.PI * Math.random();
            const phi = Math.acos(2 * Math.random() - 1);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = (r * Math.sin(phi) * Math.sin(theta)) * 0.8;
            const z = r * Math.cos(phi);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            sizes[i] = Math.random() * 0.4;

            // Colors: Mix of Blue, Purple, White
            const colorType = Math.random();
            if (colorType > 0.9) { // White/Bright (Stars)
                colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
            } else if (colorType > 0.6) { // Cyan/Blue
                colors[i * 3] = 0.2; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1;
            } else { // Deep Purple/Blue
                colors[i * 3] = 0.4; colors[i * 3 + 1] = 0.2; colors[i * 3 + 2] = 0.8;
            }
        }

        return { positions, sizes, colors };
    }, []);

    useFrame(() => {
        if (!points.current) return;
        points.current.rotation.y += 0.0005;
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={particles.positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={count}
                    array={particles.colors}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                sizeAttenuation={true}
                color="#ffffff"
                map={glowTexture}
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                vertexColors
            />
        </points>
    );
};

const ShootingStar = ({ onComplete }: { onComplete: () => void }) => {
    const mesh = useRef<THREE.Mesh>(null);
    const [startPos] = useState(() => {
        // Random start position high up
        return new THREE.Vector3(
            (Math.random() - 0.5) * 100,
            (Math.random()) * 50 + 20,
            (Math.random() - 0.5) * 100
        );
    });
    const [speed] = useState(() => Math.random() * 2 + 3);

    useFrame(() => {
        if (!mesh.current) return;
        mesh.current.position.x -= speed;
        mesh.current.position.y -= speed * 0.5;
        if (mesh.current.position.y < -50) {
            onComplete();
        }
    });

    return (
        <mesh ref={mesh} position={startPos} rotation={[0, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.05, 0.05, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
    );
};

const ShootingStarSystem = () => {
    const [stars, setStars] = useState<{ id: number }[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            // Much more frequent: Check every 400ms, 60% chance
            if (Math.random() > 0.4) {
                setStars(prev => [...prev, { id: Date.now() }]);
            }
        }, 400);
        return () => clearInterval(interval);
    }, []);

    const removeStar = (id: number) => {
        setStars(prev => prev.filter(s => s.id !== id));
    };

    return (
        <group>
            {stars.map(star => (
                <ShootingStar key={star.id} onComplete={() => removeStar(star.id)} />
            ))}
        </group>
    );
};

const MovingStars = () => {
    const count = 400;
    const mesh = useRef<THREE.Points>(null);

    // Generate random initial positions
    const particles = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100; // x
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100; // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100; // z
            sizes[i] = Math.random() < 0.1 ? 0.3 : 0.1; // Some larger stars
        }
        return { positions, sizes };
    }, []);

    useFrame(() => {
        if (!mesh.current) return;

        const positions = mesh.current.geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < count; i++) {
            // Move towards camera (positive Z)
            positions[i * 3 + 2] += 0.2;

            // Reset if passed camera
            if (positions[i * 3 + 2] > 50) {
                positions[i * 3 + 2] = -50;
                // Reshuffle X/Y for variety
                positions[i * 3] = (Math.random() - 0.5) * 100;
                positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
            }
        }

        mesh.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={particles.positions}
                    itemSize={3}
                />
                {/* Removed invalid attributes-size */}
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                sizeAttenuation={true}
                color="#ffffff"
                transparent
                opacity={0.6}
                depthWrite={false}
            />
        </points>
    );
};

const CameraRig = () => {
    useFrame(({ camera, clock }) => {
        const t = clock.getElapsedTime() * 0.05; // Slow rotation
        // Gentle orbital sway
        camera.position.x = 25 + Math.sin(t) * 5;
        camera.position.z = 25 + Math.cos(t) * 5;
        camera.lookAt(0, 0, 0);
    });
    return null;
}

const BlackThemeCanvas: React.FC = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-100">
            {/* Top Right View */}
            <Canvas camera={{ position: [25, 20, 25], fov: 40 }}>
                <CameraRig />
                <CosmicDust />
                <SolarSystem />
                <ShootingStarSystem />
                <MovingStars />
            </Canvas>
        </div>
    );
};

export default BlackThemeCanvas;
