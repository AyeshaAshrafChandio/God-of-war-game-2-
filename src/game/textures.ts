import * as THREE from 'three';

export interface ProceduralTextures {
  marble: THREE.CanvasTexture;
  stoneFloor: THREE.CanvasTexture;
  obsidian: THREE.CanvasTexture;
  bronze: THREE.CanvasTexture;
  lava: THREE.CanvasTexture;
  water: THREE.CanvasTexture;
  spartanSkin: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  particleSoft: THREE.CanvasTexture;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  maxAniso: number,
  repeatX = 1,
  repeatY = 1,
  isColor = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAniso: number): ProceduralTextures {
  // 1. Veined Ancient Greek Marble
  const [mCanvas, mCtx] = makeCanvas(256, 256);
  mCtx.fillStyle = '#c8c0b0';
  mCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 45; i++) {
    mCtx.strokeStyle = i % 3 === 0 ? 'rgba(95, 86, 75, 0.25)' : 'rgba(240, 235, 224, 0.35)';
    mCtx.lineWidth = 1 + (i % 3);
    mCtx.beginPath();
    let x = Math.random() * 256;
    let y = 0;
    mCtx.moveTo(x, y);
    while (y < 256) {
      y += 20;
      x += (Math.random() - 0.5) * 28;
      mCtx.lineTo(x, y);
    }
    mCtx.stroke();
  }
  const marble = finalizeTexture(mCanvas, maxAniso, 2, 2);

  // 2. Temple Flagstone Floor
  const [fCanvas, fCtx] = makeCanvas(256, 256);
  fCtx.fillStyle = '#3b3732';
  fCtx.fillRect(0, 0, 256, 256);
  const tile = 64;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const shade = 52 + ((r * 7 + c * 13) % 24);
      fCtx.fillStyle = `rgb(${shade + 8}, ${shade + 4}, ${shade - 2})`;
      const offset = r % 2 === 0 ? 0 : tile / 2;
      fCtx.fillRect((c * tile + offset) % 256 + 2, r * tile + 2, tile - 4, tile - 4);
      // Subtle weathered cracks
      fCtx.strokeStyle = 'rgba(20, 18, 16, 0.45)';
      fCtx.lineWidth = 1.5;
      fCtx.strokeRect((c * tile + offset) % 256 + 2, r * tile + 2, tile - 4, tile - 4);
    }
  }
  const stoneFloor = finalizeTexture(fCanvas, maxAniso, 12, 12);

  // 3. Cracked Obsidian / Volcanic Basalt
  const [oCanvas, oCtx] = makeCanvas(256, 256);
  oCtx.fillStyle = '#1c1a20';
  oCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    oCtx.fillStyle = i % 2 === 0 ? 'rgba(42, 38, 48, 0.4)' : 'rgba(12, 10, 14, 0.5)';
    oCtx.fillRect(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 20, 6 + Math.random() * 18);
  }
  const obsidian = finalizeTexture(oCanvas, maxAniso, 4, 4);

  // 4. Burnished Spartan Bronze
  const [bCanvas, bCtx] = makeCanvas(128, 128);
  const bGrad = bCtx.createLinearGradient(0, 0, 128, 128);
  bGrad.addColorStop(0, '#a87c38');
  bGrad.addColorStop(0.5, '#d4a656');
  bGrad.addColorStop(1, '#785320');
  bCtx.fillStyle = bGrad;
  bCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 40; i++) {
    bCtx.strokeStyle = 'rgba(255, 232, 175, 0.14)';
    bCtx.beginPath();
    bCtx.moveTo(0, i * 3.2);
    bCtx.lineTo(128, i * 3.2 + 4);
    bCtx.stroke();
  }
  const bronze = finalizeTexture(bCanvas, maxAniso, 1, 1);

  // 5. Molten Lava Veins
  const [lCanvas, lCtx] = makeCanvas(256, 256);
  lCtx.fillStyle = '#240804';
  lCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 28; i++) {
    lCtx.strokeStyle = i % 2 === 0 ? '#ff4e12' : '#ffaa22';
    lCtx.lineWidth = 3 + (i % 5);
    lCtx.beginPath();
    lCtx.moveTo(Math.random() * 256, Math.random() * 256);
    lCtx.quadraticCurveTo(Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256);
    lCtx.stroke();
  }
  const lava = finalizeTexture(lCanvas, maxAniso, 3, 3);

  // 6. Abyssal Subterranean Water
  const [wCanvas, wCtx] = makeCanvas(256, 256);
  wCtx.fillStyle = '#0e2f3d';
  wCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 42; i++) {
    wCtx.strokeStyle = 'rgba(85, 195, 220, 0.25)';
    wCtx.lineWidth = 2;
    wCtx.beginPath();
    const y = (i / 42) * 256;
    wCtx.moveTo(0, y);
    wCtx.bezierCurveTo(85, y + 10, 170, y - 10, 256, y);
    wCtx.stroke();
  }
  const water = finalizeTexture(wCanvas, maxAniso, 4, 4);

  // 7. Warrior Skin with Crimson War Markings
  const [sCanvas, sCtx] = makeCanvas(128, 128);
  sCtx.fillStyle = '#cfc5b8'; // Pale ashen Spartan skin
  sCtx.fillRect(0, 0, 128, 128);
  // Crimson war tattoo band
  sCtx.fillStyle = '#9e1313';
  sCtx.beginPath();
  sCtx.moveTo(15, 0);
  sCtx.lineTo(42, 0);
  sCtx.lineTo(108, 128);
  sCtx.lineTo(78, 128);
  sCtx.closePath();
  sCtx.fill();
  // Battle scars
  sCtx.strokeStyle = '#8b5e58';
  sCtx.lineWidth = 1.5;
  sCtx.beginPath();
  sCtx.moveTo(70, 30);
  sCtx.lineTo(95, 65);
  sCtx.stroke();
  const spartanSkin = finalizeTexture(sCanvas, maxAniso, 1, 1);

  // 8. Soft Radial Contact Shadow
  const [csCanvas, csCtx] = makeCanvas(128, 128);
  const csGrad = csCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  csGrad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  csGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.35)');
  csGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  csCtx.fillStyle = csGrad;
  csCtx.fillRect(0, 0, 128, 128);
  const contactShadow = finalizeTexture(csCanvas, 1, 1, 1, true);

  // 9. Soft Particle Sprite
  const [pCanvas, pCtx] = makeCanvas(64, 64);
  const pGrad = pCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  pGrad.addColorStop(0.45, 'rgba(255, 235, 190, 0.7)');
  pGrad.addColorStop(1, 'rgba(255, 120, 40, 0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 64, 64);
  const particleSoft = finalizeTexture(pCanvas, 1, 1, 1, true);

  return {
    marble,
    stoneFloor,
    obsidian,
    bronze,
    lava,
    water,
    spartanSkin,
    contactShadow,
    particleSoft,
  };
}
