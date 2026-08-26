// @ts-check

/**
 * Draws a compact, deterministic stage identity badge over generated sprites.
 * This keeps location identity readable at gameplay scale without coupling art to enemy AI.
 */
export function drawStageMotifBadge(ctx, visual, x, y, radius) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = visual.palette[2];
  ctx.strokeStyle = '#fff4d3';
  ctx.lineWidth = Math.max(1.5, radius * .16);
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#294d43';
  ctx.fillStyle = '#fff4d3';
  ctx.lineWidth = Math.max(1.2, radius * .14);
  ctx.lineCap = 'round';
  drawSymbol(ctx, visual.motifKey, radius * .72);
  ctx.restore();
}

function drawSymbol(ctx, key, size) {
  if (key === 'flower') {
    for (let index = 0; index < 4; index++) {
      const angle = index * Math.PI / 2;
      ctx.beginPath(); ctx.arc(Math.cos(angle) * size * .38, Math.sin(angle) * size * .38, size * .28, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#294d43'; ctx.beginPath(); ctx.arc(0, 0, size * .2, 0, Math.PI * 2); ctx.fill(); return;
  }
  if (key === 'tomato') {
    ctx.beginPath(); ctx.arc(0, size * .1, size * .52, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-size * .4, -size * .35); ctx.lineTo(0, -size * .05); ctx.lineTo(size * .4, -size * .35); ctx.stroke(); return;
  }
  if (key === 'coffee') {
    ctx.strokeRect(-size * .48, -size * .28, size * .72, size * .58);
    ctx.beginPath(); ctx.arc(size * .26, 0, size * .28, -Math.PI / 2, Math.PI / 2); ctx.stroke(); return;
  }
  if (key === 'book') {
    ctx.beginPath(); ctx.moveTo(0, -size * .5); ctx.lineTo(0, size * .5); ctx.moveTo(0, -size * .38); ctx.quadraticCurveTo(-size * .48, -size * .58, -size * .5, size * .35); ctx.quadraticCurveTo(-size * .25, size * .2, 0, size * .48); ctx.quadraticCurveTo(size * .25, size * .2, size * .5, size * .35); ctx.quadraticCurveTo(size * .48, -size * .58, 0, -size * .38); ctx.stroke(); return;
  }
  if (key === 'tank') {
    ctx.strokeRect(-size * .45, -size * .45, size * .9, size * .9);
    for (const offset of [-.22, .05, .32]) { ctx.beginPath(); ctx.moveTo(-size * .4, size * offset); ctx.lineTo(size * .4, size * offset); ctx.stroke(); } return;
  }
  if (key === 'leaf') {
    ctx.beginPath(); ctx.ellipse(0, 0, size * .35, size * .58, -.65, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-size * .3, size * .38); ctx.lineTo(size * .3, -size * .38); ctx.stroke(); return;
  }
  if (key === 'wrench') {
    ctx.beginPath(); ctx.moveTo(-size * .42, size * .42); ctx.lineTo(size * .34, -size * .34); ctx.stroke();
    ctx.beginPath(); ctx.arc(size * .37, -size * .37, size * .22, .55, Math.PI * 1.95); ctx.stroke(); return;
  }
  if (key === 'buoy') {
    ctx.beginPath(); ctx.arc(0, 0, size * .52, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, size * .2, 0, Math.PI * 2); ctx.stroke(); return;
  }
  if (key === 'rain') {
    for (const offset of [-.35, 0, .35]) { ctx.beginPath(); ctx.moveTo(size * offset, -size * .48); ctx.lineTo(size * (offset - .18), size * .48); ctx.stroke(); } return;
  }
  if (key === 'kite') {
    ctx.beginPath(); ctx.moveTo(0, -size * .55); ctx.lineTo(size * .48, 0); ctx.lineTo(0, size * .45); ctx.lineTo(-size * .48, 0); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, size * .45); ctx.quadraticCurveTo(size * .4, size * .48, size * .18, size * .72); ctx.stroke(); return;
  }
  if (key === 'shuttlecock') {
    ctx.beginPath(); ctx.arc(0, size * .34, size * .22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-size * .42, -size * .48); ctx.lineTo(-size * .16, size * .18); ctx.moveTo(0, -size * .55); ctx.lineTo(0, size * .18); ctx.moveTo(size * .42, -size * .48); ctx.lineTo(size * .16, size * .18); ctx.stroke(); return;
  }
  ctx.beginPath(); ctx.arc(0, 0, size * .52, 0, Math.PI); ctx.stroke();
  for (const offset of [-.25, .2]) { ctx.beginPath(); ctx.moveTo(size * offset, -size * .05); ctx.quadraticCurveTo(size * (offset - .18), -size * .35, size * offset, -size * .62); ctx.stroke(); }
}
