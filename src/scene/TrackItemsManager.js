import * as THREE from 'three';
import { skinManager } from '../game/KartSkinManager.js';

/**
 * TrackItemsManager: Manages 3D interactive items scattered on the road:
 * - Collectible Gold Coins & Ruby Gems (+coins, audio, particles)
 * - Oil Slicks / Ink Puddles (slip & spin hazard)
 * - Electric Laser Barriers (shock & slowdown hazard)
 * - Turbo Boost Pads (nitro rocket boost)
 */
export function createTrackItemsManager(scene, audioSynth) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'TrackItemsRootGroup';
  scene.add(rootGroup);

  const coins = [];
  const hazards = [];
  const boostPads = [];

  // Reusable materials
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.92,
    roughness: 0.18,
    emissive: 0x885500,
    emissiveIntensity: 0.35,
  });

  const gemMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    metalness: 0.3,
    roughness: 0.1,
    emissive: 0x00a0e0,
    emissiveIntensity: 0.65,
  });

  const oilMat = new THREE.MeshStandardMaterial({
    color: 0x07090e,
    roughness: 0.05,
    metalness: 0.85,
    transparent: true,
    opacity: 0.92,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x333842,
    metalness: 0.8,
    roughness: 0.3,
  });

  const laserActiveMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.9,
  });

  const boostPadMat = new THREE.MeshBasicMaterial({
    color: 0xff7700,
    transparent: true,
    opacity: 0.92,
  });

  // Reusable vector scratchpads
  const _kartPos = new THREE.Vector3();
  const _itemPos = new THREE.Vector3();

  // Floating notification state for UI
  let onNotificationCallback = null;
  let sessionCoinsCollected = 0;

  function clearAllItems() {
    while (rootGroup.children.length > 0) {
      const child = rootGroup.children[0];
      rootGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
    coins.length = 0;
    hazards.length = 0;
    boostPads.length = 0;
    sessionCoinsCollected = 0;
  }

  /**
   * Populates the track with coins, gems, oil slicks, laser barriers, and boost pads
   * based on the given level config and track spline samples.
   */
  function populateForLevel(levelConfig, splineSamples) {
    clearAllItems();
    if (!splineSamples || splineSamples.length === 0) return;

    const N = splineSamples.length;
    const coinCount = levelConfig.coinCount || 20;
    const gemCount = levelConfig.gemCount || 0;
    const oilCount = levelConfig.oilSlicksCount || 0;
    const laserCount = levelConfig.electricLaserCount || 0;
    const boostCount = levelConfig.boostPadsCount || 2;

    // 1. Place Collectible Gold Coins & Rare Gems
    const coinStep = Math.floor(N / (coinCount + gemCount + 2));
    const coinGeo = new THREE.CylinderGeometry(0.0028, 0.0028, 0.0007, 16);
    coinGeo.rotateX(Math.PI / 2); // Stand upright like a coin
    const gemGeo = new THREE.OctahedronGeometry(0.0025, 0);

    for (let c = 0; c < coinCount + gemCount; c++) {
      const sIdx = ((c + 1) * coinStep + Math.floor(c * 3.7)) % N;
      const s = splineSamples[sIdx];
      const isGem = c < gemCount;

      // Subtle lateral variation across 3 racing lanes: left, center, right
      const laneOffset = ((c % 3) - 1) * 0.0042;
      const p = new THREE.Vector3(...s.position)
        .addScaledVector(new THREE.Vector3(...s.right), laneOffset)
        .addScaledVector(new THREE.Vector3(...s.normal), 0.0035);

      const mesh = new THREE.Mesh(isGem ? gemGeo : coinGeo, isGem ? gemMat : coinMat);
      mesh.position.copy(p);
      mesh.castShadow = true;
      rootGroup.add(mesh);

      coins.push({
        mesh,
        baseY: p.y,
        isGem,
        value: isGem ? 35 : 10,
        collected: false,
        phase: Math.random() * Math.PI * 2,
        sArc: s.arc_length_m,
      });
    }

    // 2. Place Turbo Boost Pads
    const boostStep = Math.floor(N / (boostCount + 1));
    const boostPadGeo = new THREE.PlaneGeometry(0.012, 0.016);
    boostPadGeo.rotateX(-Math.PI / 2);

    for (let b = 0; b < boostCount; b++) {
      const sIdx = ((b + 0.5) * boostStep) % N;
      const s = splineSamples[sIdx];
      const p = new THREE.Vector3(...s.position).addScaledVector(
        new THREE.Vector3(...s.normal),
        0.0004
      );

      const bGroup = new THREE.Group();
      bGroup.position.copy(p);

      // Align pad to track tangent & normal
      const r = new THREE.Vector3(...s.right);
      const n = new THREE.Vector3(...s.normal);
      const t = new THREE.Vector3(...s.tangent);
      const mat4 = new THREE.Matrix4().makeBasis(r, n, t);
      bGroup.quaternion.setFromRotationMatrix(mat4);

      const padMesh = new THREE.Mesh(boostPadGeo, boostPadMat);
      bGroup.add(padMesh);
      rootGroup.add(bGroup);

      boostPads.push({
        group: bGroup,
        pos: p,
        cooldown: 0.0,
      });
    }

    // 3. Place Oil Slicks (Slippery Hazards)
    if (oilCount > 0) {
      const oilStep = Math.floor(N / (oilCount + 1));
      const oilGeo = new THREE.PlaneGeometry(0.012, 0.015);
      oilGeo.rotateX(-Math.PI / 2);

      for (let o = 0; o < oilCount; o++) {
        const sIdx = (Math.floor(N * 0.15) + (o + 1) * oilStep) % N;
        const s = splineSamples[sIdx];
        const laneOffset = ((o % 2 === 0 ? 1 : -1) * 0.0035);
        const p = new THREE.Vector3(...s.position)
          .addScaledVector(new THREE.Vector3(...s.right), laneOffset)
          .addScaledVector(new THREE.Vector3(...s.normal), 0.0003);

        const oGroup = new THREE.Group();
        oGroup.position.copy(p);

        const r = new THREE.Vector3(...s.right);
        const n = new THREE.Vector3(...s.normal);
        const t = new THREE.Vector3(...s.tangent);
        const mat4 = new THREE.Matrix4().makeBasis(r, n, t);
        oGroup.quaternion.setFromRotationMatrix(mat4);

        const puddle = new THREE.Mesh(oilGeo, oilMat);
        oGroup.add(puddle);
        rootGroup.add(oGroup);

        hazards.push({
          type: 'oil',
          group: oGroup,
          pos: p,
          cooldown: 0.0,
        });
      }
    }

    // 4. Place Electric Laser Shock Barriers
    if (laserCount > 0) {
      const laserStep = Math.floor(N / (laserCount + 1));
      const pylonGeo = new THREE.CylinderGeometry(0.001, 0.0014, 0.008, 8);
      const beamGeo = new THREE.CylinderGeometry(0.0004, 0.0004, 0.024, 8);
      beamGeo.rotateZ(Math.PI / 2); // Span across width

      for (let l = 0; l < laserCount; l++) {
        const sIdx = (Math.floor(N * 0.3) + (l + 1) * laserStep) % N;
        const s = splineSamples[sIdx];
        const p = new THREE.Vector3(...s.position).addScaledVector(
          new THREE.Vector3(...s.normal),
          0.004
        );

        const lGroup = new THREE.Group();
        lGroup.position.copy(p);

        const r = new THREE.Vector3(...s.right);
        const n = new THREE.Vector3(...s.normal);
        const t = new THREE.Vector3(...s.tangent);
        const mat4 = new THREE.Matrix4().makeBasis(r, n, t);
        lGroup.quaternion.setFromRotationMatrix(mat4);

        // Left & Right Guardrail Pylons
        for (const side of [-1, 1]) {
          const pylon = new THREE.Mesh(pylonGeo, pylonMat);
          pylon.position.set(side * 0.012, 0, 0);
          lGroup.add(pylon);
        }

        // Horizontal electric laser beam
        const beam = new THREE.Mesh(beamGeo, laserActiveMat);
        beam.name = 'LaserBeam';
        lGroup.add(beam);
        rootGroup.add(lGroup);

        hazards.push({
          type: 'laser',
          group: lGroup,
          beamMesh: beam,
          pos: p,
          active: true,
          timer: (l * 0.7) % 3.5, // Staggered cycle
          cycleDuration: 3.6,
          activeDuration: 2.1,
          cooldown: 0.0,
        });
      }
    }
  }

  /**
   * Resets coins visibility for a new race attempt without clearing items.
   */
  function resetCoinsForRace() {
    sessionCoinsCollected = 0;
    for (const c of coins) {
      c.collected = false;
      c.mesh.visible = true;
    }
  }

  /**
   * Frame update & collision detection with the player kart.
   */
  function update(dt, kartRoot, physicsState) {
    if (!kartRoot) return;
    kartRoot.getWorldPosition(_kartPos);
    const timeSec = performance.now() * 0.001;

    // 1. Animate and check Coins
    for (const c of coins) {
      if (c.collected) continue;
      c.mesh.rotation.y += 3.2 * dt;
      // Gentle bobbing
      c.mesh.position.y = c.baseY + Math.sin(timeSec * 4.5 + c.phase) * 0.0008;

      _itemPos.copy(c.mesh.position);
      const dSq = _kartPos.distanceToSquared(_itemPos);
      // HO Micro Scale pickup radius ~9.5mm
      if (dSq < 0.0095 * 0.0095) {
        c.collected = true;
        c.mesh.visible = false;
        sessionCoinsCollected += c.value;
        skinManager.addCoins(c.value);

        if (audioSynth.playCoinPickupSound) {
          audioSynth.playCoinPickupSound();
        }
        if (onNotificationCallback) {
          onNotificationCallback({
            type: 'coin',
            text: `+${c.value} COINS! 🪙`,
            color: c.isGem ? '#00e5ff' : '#ffd700',
          });
        }
      }
    }

    // 2. Animate and check Boost Pads
    for (const b of boostPads) {
      if (b.cooldown > 0) {
        b.cooldown -= dt;
      }
      const dSq = _kartPos.distanceToSquared(b.pos);
      if (dSq < 0.012 * 0.012 && b.cooldown <= 0) {
        b.cooldown = 1.2;
        if (physicsState) {
          physicsState.boostActive = 2.4;
          const topSpd = (physicsState.topSpeedMultiplier || 1.0) * 0.31;
          physicsState.speed = Math.max(physicsState.speed, topSpd);
        }
        if (audioSynth.playBoosterSound) {
          audioSynth.playBoosterSound();
        }
        if (onNotificationCallback) {
          onNotificationCallback({
            type: 'boost',
            text: '🚀 NITRO SUPER BOOST!',
            color: '#ff9100',
          });
        }
      }
    }

    // 3. Animate and check Hazards (Oil slicks & Lasers)
    for (const h of hazards) {
      if (h.cooldown > 0) {
        h.cooldown -= dt;
      }

      if (h.type === 'laser') {
        h.timer = (h.timer + dt) % h.cycleDuration;
        const isActive = h.timer < h.activeDuration;
        h.active = isActive;
        if (h.beamMesh) {
          h.beamMesh.visible = isActive;
        }

        if (isActive) {
          const dSq = _kartPos.distanceToSquared(h.pos);
          if (dSq < 0.011 * 0.011 && h.cooldown <= 0) {
            h.cooldown = 1.4;
            // Electric Shock: loss of speed & drop coins
            if (physicsState) {
              physicsState.speed *= 0.3;
              physicsState.hopVel = 0.011;
              physicsState.boostActive = 0.0;
            }
            if (audioSynth.playHazardHitSound) {
              audioSynth.playHazardHitSound(true);
            }
            if (onNotificationCallback) {
              onNotificationCallback({
                type: 'hazard',
                text: '⚡ ELECTRIC SHOCK! DANGER!',
                color: '#ff0055',
              });
            }
          }
        }
      } else if (h.type === 'oil') {
        const dSq = _kartPos.distanceToSquared(h.pos);
        if (dSq < 0.009 * 0.009 && h.cooldown <= 0) {
          h.cooldown = 1.5;
          if (physicsState) {
            // Spin kart slightly and lose 35% speed
            const spinDir = Math.random() > 0.5 ? 1 : -1;
            physicsState.headingYaw += spinDir * 0.28;
            physicsState.speed *= 0.62;
            physicsState.isDrifting = true;
          }
          if (audioSynth.playHazardHitSound) {
            audioSynth.playHazardHitSound(false);
          }
          if (onNotificationCallback) {
            onNotificationCallback({
              type: 'oil',
              text: '⚠️ OIL SLICK! SLIPPED!',
              color: '#ffea00',
            });
          }
        }
      }
    }
  }

  return {
    rootGroup,
    populateForLevel,
    resetCoinsForRace,
    update,
    getSessionCoins: () => sessionCoinsCollected,
    setNotificationCallback: (cb) => {
      onNotificationCallback = cb;
    },
  };
}
