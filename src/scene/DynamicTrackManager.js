import * as THREE from 'three';
import { buildCoasterTrack } from './CoasterTrackBuilder.js';

/**
 * DynamicTrackManager:
 * Procedurally generates completely distinct 3D road trajectories, elevations,
 * banked turns, and obstacle setups for every single level (Level 1, 2, 3, 4, 5... infinity),
 * guaranteeing that no two levels have the same road layout!
 */
export function createDynamicTrackManager(scene, baseSplineData) {
  let currentCoaster = null;
  let currentSplineData = baseSplineData;

  /**
   * Generates a unique, smooth closed-loop 3D spline dataset for any level config.
   */
  function generateSplineForLevel(levelConfig) {
    if (!baseSplineData || !baseSplineData.samples) {
      return baseSplineData;
    }

    const baseSamples = baseSplineData.samples;
    const N = baseSamples.length;
    const totalArc = baseSplineData.total_length_m || 3.837;

    const mod = levelConfig.splineMod || {};
    const levelId = levelConfig.id || 1;
    const pathType = mod.pathType || 'classic';
    const heightScale = mod.heightScale ?? 1.0;
    const waveFreq = mod.waveFreq ?? 0.0;
    const waveAmp = mod.waveAmp ?? 0.0;
    const lateralAmp = mod.lateralAmp ?? 0.0;
    const lateralFreq = mod.lateralFreq ?? 0.0;
    const bankScale = mod.bankScale ?? 1.0;

    // Tabletop safe bounding box (meters)
    const MIN_X = -0.505;
    const MAX_X = 0.485;
    const MIN_Z = -0.270;
    const MAX_Z = 0.265;
    const MIN_Y = 0.015;
    const MAX_Y = 0.280;

    // 1. Modulate 3D positions with level-specific curve topology
    const newPositions = [];
    for (let i = 0; i < N; i++) {
      const s = baseSamples[i];
      const p = new THREE.Vector3(...s.position);
      const u = i / N; // normalized track progress [0, 1)

      // Start/finish straight safety envelope:
      // u near 0.0 and 1.0 (Sector 6 viaduct) smoothly anchors to the start gantry
      const startDist = Math.min(u, 1.0 - u);
      const env = Math.min(1.0, Math.max(0.0, (startDist - 0.035) / 0.075));
      const smoothEnv = env * env * (3.0 - 2.0 * env);

      let dx = 0.0;
      let dz = 0.0;
      let dy = 0.0;

      if (levelId === 1) {
        // Level 1: Classic flowing desk loop with gentle elevation
        dy = (p.y - 0.035) * 0.25;
      } else if (pathType === 'mountain_ridge' || levelId === 2) {
        // Level 2: Book Mountain Ridge
        // Soars high over the laptop stand, swoops behind the screen, and descends into an S-curve
        dy += Math.sin(u * Math.PI * 2.0) * 0.045 * smoothEnv;
        dy += Math.cos(u * Math.PI * 4.0) * 0.025 * smoothEnv;
        if (s.sector === 1 || s.sector === 2) {
          dy += 0.055; // high mountain climb
        }
        // Lateral swing into mousepad area
        dx += Math.sin(u * Math.PI * 2.0) * 0.085 * smoothEnv;
        dz += Math.cos(u * Math.PI * 3.0) * 0.055 * smoothEnv;
      } else if (pathType === 'cyber_slalom' || levelId === 3) {
        // Level 3: Cyber Night Canyon
        // High-speed zig-zag chicane slalom across the desk with elevated flyover
        dx += Math.sin(u * Math.PI * 7.0) * 0.125 * smoothEnv;
        dz += Math.cos(u * Math.PI * 5.0) * 0.075 * smoothEnv;
        dy += (0.04 + Math.sin(u * Math.PI * 3.0) * 0.055) * smoothEnv;
        if (u > 0.45 && u < 0.65) {
          dy += 0.065 * smoothEnv; // elevated crossover bridge
        }
      } else if (pathType === 'hazard_bridge' || levelId === 4) {
        // Level 4: Stationery Danger Bridge
        // Rollercoaster camelback humps and tight hairpins
        dy += Math.sin(u * Math.PI * 9.0) * 0.042 * smoothEnv;
        dx += Math.sin(u * Math.PI * 4.0) * 0.145 * smoothEnv;
        dz += Math.sin(u * Math.PI * 6.0) * 0.095 * smoothEnv;
        if (s.sector === 3 || s.sector === 4) {
          dy += 0.075 * smoothEnv;
        }
      } else if (pathType === 'magma_inferno' || levelId === 5) {
        // Level 5: Lava Coffee Inferno
        // Sky-high lamp helix, steep dives, and high lateral banks
        dy += (Math.sin(u * Math.PI * 2.0) * 0.075 + Math.cos(u * Math.PI * 6.0) * 0.035) * smoothEnv;
        dx += (Math.cos(u * Math.PI * 3.0) * 0.165 + Math.sin(u * Math.PI * 7.0) * 0.045) * smoothEnv;
        dz += Math.sin(u * Math.PI * 4.0) * 0.115 * smoothEnv;
        if (s.sector === 4) {
          dy += 0.095 * smoothEnv; // High climb around desk lamp
        }
      } else {
        // Level 6+: Infinite Procedural Chaos Tracks!
        // Seeded harmonic functions create a completely new track for each stage
        const seed = levelId * 137.5;
        const f1 = 2 + (levelId % 5);
        const f2 = 4 + ((levelId * 3) % 4);
        const f3 = 3 + ((levelId * 7) % 5);
        const f4 = 6 + (levelId % 4);

        const ampX = Math.min(0.18, 0.09 + (levelId % 6) * 0.015);
        const ampZ = Math.min(0.12, 0.06 + (levelId % 4) * 0.015);
        const ampY = Math.min(0.065, 0.035 + (levelId % 5) * 0.006);

        dx += (Math.sin(u * Math.PI * f1 + seed) * ampX + Math.cos(u * Math.PI * f2) * 0.04) * smoothEnv;
        dz += (Math.cos(u * Math.PI * f3 + seed * 0.5) * ampZ + Math.sin(u * Math.PI * f1) * 0.03) * smoothEnv;
        dy += (Math.sin(u * Math.PI * f4) * ampY + Math.cos(u * Math.PI * f1) * (ampY * 0.6)) * smoothEnv;

        if ((levelId + i) % 180 < 60) {
          dy += 0.05 * smoothEnv; // elevated sky bridge sector
        }
      }

      // Apply modifiers
      p.x = THREE.MathUtils.clamp(p.x + dx, MIN_X, MAX_X);
      p.z = THREE.MathUtils.clamp(p.z + dz, MIN_Z, MAX_Z);
      p.y = THREE.MathUtils.clamp(p.y + dy, MIN_Y, MAX_Y);

      newPositions.push(p);
    }

    // 2. Smooth positions with 3-pass moving-average filter for silky C2 curvature continuity
    for (let pass = 0; pass < 3; pass++) {
      const smoothed = newPositions.map((v) => v.clone());
      for (let i = 0; i < N; i++) {
        const pPrev = newPositions[(i - 1 + N) % N];
        const pCurr = newPositions[i];
        const pNext = newPositions[(i + 1) % N];
        smoothed[i]
          .copy(pCurr)
          .multiplyScalar(0.6)
          .addScaledVector(pPrev, 0.2)
          .addScaledVector(pNext, 0.2);
      }
      for (let i = 0; i < N; i++) {
        newPositions[i].copy(smoothed[i]);
      }
    }

    // 3. Compute Frenet-Serret orthonormal frames (tangent, right, normal) and banking
    const newSamples = [];
    const arcLengths = new Float32Array(N + 1);
    let accumArc = 0.0;

    for (let i = 0; i < N; i++) {
      const pPrev = newPositions[(i - 1 + N) % N];
      const pCurr = newPositions[i];
      const pNext = newPositions[(i + 1) % N];

      const segLen = pCurr.distanceTo(pNext);
      arcLengths[i] = accumArc;
      accumArc += segLen;

      // Tangent
      const tangent = new THREE.Vector3().subVectors(pNext, pPrev).normalize();

      // Right vector banked along world Up and local banking angle
      const baseRight = new THREE.Vector3(...baseSamples[i].right);
      const baseBank = baseSamples[i].bank_deg || 0;
      let modBank = baseBank * bankScale;

      // Dynamic banking calculation based on track curvature
      const curvatureVec = new THREE.Vector3()
        .subVectors(pNext, pCurr)
        .sub(new THREE.Vector3().subVectors(pCurr, pPrev));
      const lateralCurvature = curvatureVec.x * -tangent.z + curvatureVec.z * tangent.x;
      modBank += THREE.MathUtils.clamp(lateralCurvature * 350.0 * bankScale, -35.0, 35.0);

      const bankRad = (modBank * Math.PI) / 180.0;
      const worldUp = new THREE.Vector3(0, 1, 0);
      let right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize();
      if (right.lengthSq() < 1e-4) {
        right.copy(baseRight);
      }

      let normal = new THREE.Vector3().crossVectors(right, tangent).normalize();

      // Apply banking rotation around tangent
      if (Math.abs(bankRad) > 1e-4) {
        right.applyAxisAngle(tangent, bankRad).normalize();
        normal.applyAxisAngle(tangent, bankRad).normalize();
      }

      newSamples.push({
        index: i,
        t: i / N,
        position: [pCurr.x, pCurr.y, pCurr.z],
        tangent: [tangent.x, tangent.y, tangent.z],
        right: [right.x, right.y, right.z],
        normal: [normal.x, normal.y, normal.z],
        bank_deg: modBank,
        curvature_inv_m: baseSamples[i].curvature_inv_m,
        arc_length_m: arcLengths[i],
        sector: baseSamples[i].sector,
      });
    }

    return {
      ...baseSplineData,
      name: `${levelConfig.name} Spline`,
      total_length_m: accumArc,
      samples: newSamples,
    };
  }

  /**
   * Builds and installs the track for a level
   */
  function installTrackForLevel(levelConfig, onF1LightsCallback) {
    if (currentCoaster) {
      if (currentCoaster.trackGroup.parent) {
        currentCoaster.trackGroup.parent.remove(currentCoaster.trackGroup);
      }
      if (currentCoaster.underTrackLedGroup && currentCoaster.underTrackLedGroup.parent) {
        currentCoaster.underTrackLedGroup.parent.remove(currentCoaster.underTrackLedGroup);
      }
      if (currentCoaster.debugGroup && currentCoaster.debugGroup.parent) {
        currentCoaster.debugGroup.parent.remove(currentCoaster.debugGroup);
      }
      if (currentCoaster.dispose) {
        currentCoaster.dispose();
      }
    }

    const levelSpline = generateSplineForLevel(levelConfig);
    currentSplineData = levelSpline;

    const themeOpts = {
      roadColor: levelConfig.theme.roadColor,
      curbRed: levelConfig.theme.curbRed,
      curbWhite: levelConfig.theme.curbWhite,
      ledColor: levelConfig.theme.ledColor,
    };

    const newCoaster = buildCoasterTrack(levelSpline, themeOpts);
    scene.add(newCoaster.trackGroup);
    if (newCoaster.underTrackLedGroup) {
      scene.add(newCoaster.underTrackLedGroup);
    }
    if (newCoaster.debugGroup) {
      scene.add(newCoaster.debugGroup);
    }

    currentCoaster = newCoaster;
    if (onF1LightsCallback) {
      onF1LightsCallback(newCoaster);
    }

    return {
      coaster: newCoaster,
      splineData: levelSpline,
    };
  }

  return {
    generateSplineForLevel,
    installTrackForLevel,
    getCurrentSplineData: () => currentSplineData,
    getCurrentCoaster: () => currentCoaster,
  };
}
