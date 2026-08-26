// @ts-check

import { ENEMY_AI_TYPE } from './EnemyAiProfiles.js';

/**
 * Stage appearance is deliberately independent from combat theme and movement AI.
 * The renderer may replace any asset in this profile without changing simulation rules.
 * @typedef {{
 *   id:string, vi:string, ko:string, time:string, weather:string, motifKey:string,
 *   palette:readonly string[], motifs:readonly string[], stage:number, baseStage:number, cycle:number,
 *   variant:string, tint:string, group:string, mapAssetId:string, bossAssetId:string,
 *   enemyAssetIds:Readonly<Record<string,string>>
 * }} StageVisualProfile
 */

const STAGES = [
  stage({ id: 'flower-market', motifKey: 'flower', vi: 'Chợ hoa sớm', ko: '새벽 꽃시장', time: '새벽', weather: '보송한 새벽 공기', palette: ['#f7d6c5', '#527d68', '#f2b24f'], motifs: ['꽃바구니', '포장지', '꽃잎 수레'] }),
  stage({ id: 'morning-market', motifKey: 'tomato', vi: 'Hẻm chợ sáng', ko: '아침 재래시장 골목', time: '아침', weather: '부드러운 햇빛', palette: ['#f2d39b', '#b6533f', '#3e7564'], motifs: ['대나무 바구니', '상자', '영수증'] }),
  stage({ id: 'sidewalk-cafe', motifKey: 'coffee', vi: 'Cà phê vỉa hè', ko: '보도 카페', time: '오전', weather: '차양 아래 그늘', palette: ['#e5c38f', '#466f68', '#b85c45'], motifs: ['낮은 의자', '핀 필터', '차양'] }),
  stage({ id: 'school-gate', motifKey: 'book', vi: 'Cổng trường', ko: '등교 시간 학교 앞', time: '아침', weather: '맑음', palette: ['#f4cf62', '#56839c', '#d85e49'], motifs: ['공책', '가방', '자전거 벨'] }),
  stage({ id: 'residential-alley', motifKey: 'tank', vi: 'Hẻm nhà buổi trưa', ko: '한낮 주택 골목', time: '한낮', weather: '벽 사이 햇살', palette: ['#f0d8b3', '#488a7c', '#d87552'], motifs: ['빨래집게', '슬리퍼', '물통'] }),
  stage({ id: 'tropical-courtyard', motifKey: 'leaf', vi: 'Sân cây nhiệt đới', ko: '열대 식물 안뜰', time: '오후', weather: '잎 사이 바람', palette: ['#bad58a', '#39725e', '#ef9c55'], motifs: ['화분', '잎', '덩굴'] }),
  stage({ id: 'repair-row', motifKey: 'wrench', vi: 'Dãy tiệm sửa', ko: '수리점 거리', time: '오후', weather: '따뜻한 금속빛', palette: ['#d7b26d', '#4f6e70', '#c4503d'], motifs: ['타이어', '렌치', '선풍기'] }),
  stage({ id: 'riverside-quay', motifKey: 'buoy', vi: 'Bến sông', ko: '강변 선착장', time: '늦은 오후', weather: '강바람', palette: ['#84bfc3', '#2f6f75', '#edb65e'], motifs: ['밧줄', '부표', '생선 상자'] }),
  stage({ id: 'monsoon-street', motifKey: 'rain', vi: 'Phố mưa mùa', ko: '몬순 배수로 거리', time: '비 오는 오후', weather: '몬순', palette: ['#7898a8', '#315c68', '#e7b94e'], motifs: ['빗방울', '우비', '배수구'] }),
  stage({ id: 'rooftop-dusk', motifKey: 'kite', vi: 'Sân thượng hoàng hôn', ko: '해질녘 아파트 옥상', time: '해질녘', weather: '높은 바람', palette: ['#df9a72', '#535f79', '#f0cf72'], motifs: ['빨래', '안테나', '물탱크'] }),
  stage({ id: 'evening-park', motifKey: 'shuttlecock', vi: 'Công viên khu phố', ko: '저녁 동네 운동공원', time: '저녁', weather: '선선함', palette: ['#8ebd83', '#3f6f67', '#f4c25d'], motifs: ['셔틀콕', '훌라후프', '벤치'] }),
  stage({ id: 'night-food-row', motifKey: 'bowl', vi: 'Hàng quán đêm', ko: '밤 길거리 음식 거리', time: '밤', weather: '따뜻한 김', palette: ['#283f52', '#b44f3f', '#f1c45b'], motifs: ['그릇', '꼬치', '접이식 탁자'] })
];

const CYCLE_VARIANTS = Object.freeze([
  { label: '원형', tint: 'transparent', weather: null },
  { label: '비 갠 뒤', tint: 'rgba(68,126,132,.14)', weather: '젖은 노면' },
  { label: '노을 순환', tint: 'rgba(207,102,62,.14)', weather: '긴 그림자' },
  { label: '야간 순환', tint: 'rgba(28,48,75,.22)', weather: '생활 불빛' }
]);

/** @returns {Readonly<StageVisualProfile>} */
export function stageVisualFor(stageNumber = 1) {
  const normalized = Math.max(1, Math.floor(Number(stageNumber) || 1));
  const baseStage = (normalized - 1) % STAGES.length + 1;
  const cycle = Math.floor((normalized - 1) / STAGES.length);
  const base = STAGES[baseStage - 1];
  const variant = CYCLE_VARIANTS[cycle % CYCLE_VARIANTS.length];
  const appearanceRoles = ['basic', 'interceptor', 'curve'];
  const roleFor = index => appearanceRoles[(index + cycle) % appearanceRoles.length];
  const assetPrefix = `stage.${String(baseStage).padStart(2, '0')}.enemy`;
  return Object.freeze({
    ...base,
    stage: normalized,
    baseStage,
    cycle,
    variant: variant.label,
    tint: variant.tint,
    weather: variant.weather ?? base.weather,
    group: `stage-${String(baseStage).padStart(2, '0')}`,
    mapAssetId: `stage.${String(baseStage).padStart(2, '0')}.map`,
    bossAssetId: `stage.${String(baseStage).padStart(2, '0')}.boss`,
    enemyAssetIds: Object.freeze({
      [ENEMY_AI_TYPE.PURSUER]: `${assetPrefix}.${roleFor(0)}`,
      [ENEMY_AI_TYPE.INTERCEPTOR]: `${assetPrefix}.${roleFor(1)}`,
      [ENEMY_AI_TYPE.CURVE_RAIDER]: `${assetPrefix}.${roleFor(2)}`
    })
  });
}

export function stageVisuals() { return STAGES.map((_, index) => stageVisualFor(index + 1)); }
export function nextStageGroup(stageNumber) { return stageVisualFor(Math.max(1, stageNumber) + 1).group; }
export function stageLabel(stageNumber) {
  const visual = stageVisualFor(stageNumber);
  return `${visual.vi} · ${visual.ko}`;
}

function stage(definition) {
  return Object.freeze({ ...definition, palette: Object.freeze([...definition.palette]), motifs: Object.freeze([...definition.motifs]) });
}
