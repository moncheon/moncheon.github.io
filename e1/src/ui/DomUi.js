// @ts-check

import { globalXpRequired, openingPickCount } from '../domain/progression.js';

const $ = selector => document.querySelector(selector);

export class DomUi {
  constructor() {
    this.nodes = {
      title: $('#title-screen'), hud: $('#hud'), draft: $('#draft-screen'), pause: $('#pause-screen'), end: $('#end-screen'), transition: $('#stage-transition'),
      start: $('#start'), skip: $('#skip-stages'), restart: $('#restart'), newSeed: $('#new-seed'), dev: $('#dev-mode'), showcase: $('#showcase'),
      abandon: $('#abandon-run'), home: $('#end-home'),
      profile: $('#profile-summary'), achievements: $('#achievements'), draftRows: $('#draft-rows'), draftConfirm: $('#draft-confirm'),
      draftTitle: $('#draft-title'), draftSubtitle: $('#draft-subtitle'), endSummary: $('#end-summary'), toast: $('#toast'),
      transitionPlace: $('#transition-place'), transitionMeta: $('#transition-meta'), transitionReason: $('#transition-reason')
    };
    this.toastTimer = 0;
  }

  bind(actions) {
    this.nodes.start.addEventListener('click', actions.start);
    this.nodes.skip.addEventListener('click', actions.skip);
    this.nodes.restart.addEventListener('click', actions.restart);
    this.nodes.newSeed.addEventListener('click', actions.newSeed);
    this.nodes.dev.addEventListener('click', actions.dev);
    this.nodes.abandon.addEventListener('click', actions.abandon);
    this.nodes.home.addEventListener('click', actions.home);
  }

  showTitle(profile, hasCampaign, maxSkip) {
    this.hideOverlays(); this.nodes.title.classList.remove('hidden'); this.nodes.hud.classList.add('hidden');
    this.nodes.start.textContent = hasCampaign ? '캠페인 계속' : '새 캠페인 시작';
    this.nodes.skip.classList.toggle('hidden', hasCampaign || maxSkip < 1);
    this.nodes.skip.textContent = `Stage ${maxSkip}까지 일괄 스킵`;
    this.nodes.profile.textContent = `LV ${profile.globalLevel} · XP ${Math.floor(profile.globalXp)}/${globalXpRequired(profile.globalLevel)} · 시작 선택 ${openingPickCount(profile.globalLevel)} · 보스 ${profile.totalBossStagesCleared}`;
    this.renderAchievements(profile);
  }

  renderAchievements(profile) {
    const definitions = [
      ['no-hit-boss', '무결점 집행', '보스 도달까지 무피격 · 기본 회피 상승'],
      ['pacifist-boss', '손대지 않은 왕관', '60초 무처치로 공개 · 무처치 보스 완료로 성장']
    ];
    this.nodes.achievements.replaceChildren(...definitions.map(([id, title, description]) => {
      const progress = profile.achievements[id];
      const item = document.createElement('div'); item.className = `achievement ${progress?.complete ? 'complete' : ''}`;
      item.innerHTML = progress?.revealed
        ? `<strong>${title}</strong><span>${description}${progress.text ? ` · ${progress.text}` : progress.value ? ` · ${progress.value}회` : ''}</span>`
        : '<strong>???</strong><span>조건을 발견하면 공개</span>';
      return item;
    }));
  }

  showPlaying() { this.hideOverlays(); this.nodes.hud.classList.remove('hidden'); }
  showShowcase() { this.hideOverlays(); this.nodes.hud.classList.add('hidden'); this.nodes.showcase.classList.remove('hidden'); }
  showPaused() { this.nodes.pause.classList.remove('hidden'); }
  hidePaused() { this.nodes.pause.classList.add('hidden'); }

  showDraft(rows, title, subtitle, onConfirm) {
    this.hideOverlays();
    this.nodes.draftTitle.textContent = title;
    this.nodes.draftSubtitle.textContent = subtitle;
    const selections = new Map();
    this.nodes.draftRows.replaceChildren(...rows.map((row, rowIndex) => {
      const section = document.createElement('section'); section.className = 'draft-row';
      const heading = document.createElement('strong'); heading.textContent = `${rowIndex + 1}. ${row.themeId.toUpperCase()}`;
      const choices = document.createElement('div'); choices.className = 'choices';
      choices.replaceChildren(...row.choices.map(choice => {
        const button = document.createElement('button'); button.className = 'choice';
        button.innerHTML = `<span>${choice.path} · ${choice.rarity}</span><h3>${choice.title}</h3><p>${choice.description}</p><small>${choice.quality.join(' · ')}</small>`;
        button.addEventListener('click', () => {
          selections.set(row.id, choice);
          for (const sibling of Array.from(choices.children)) sibling.classList.toggle('selected', sibling === button);
          this.nodes.draftConfirm.disabled = selections.size !== rows.length;
        });
        return button;
      }));
      section.append(heading, choices); return section;
    }));
    this.nodes.draftConfirm.disabled = rows.length > 0;
    this.nodes.draftConfirm.onclick = () => onConfirm(rows.map(row => ({ themeId: row.themeId, choice: selections.get(row.id) })));
    this.nodes.draft.classList.remove('hidden'); this.nodes.hud.classList.add('hidden');
  }

  showEnd(profile, summary) {
    this.hideOverlays(); this.nodes.end.classList.remove('hidden'); this.nodes.hud.classList.add('hidden');
    this.nodes.endSummary.textContent = `${summary} · GLOBAL LV ${profile.globalLevel} · 누적 보스 ${profile.totalBossStagesCleared}`;
  }

  showTransition(visual, reason) {
    this.hideOverlays(); this.nodes.hud.classList.add('hidden');
    this.nodes.transitionPlace.textContent = visual.vi;
    this.nodes.transitionMeta.textContent = `${visual.ko} · ${visual.time} · ${visual.weather} · ${visual.motifs.join(' / ')}`;
    this.nodes.transitionReason.textContent = reason;
    this.nodes.transition.classList.remove('hidden');
  }

  updateHud(hud, attackEnabled, speed = 1) {
    $('#theme-stat').textContent = `${hud.location} · STAGE ${hud.stage} · ${hud.phase}`;
    $('#stage-weather').textContent = `${hud.weather} · 적 AI ${hud.enemyAi}`;
    $('#health').textContent = hud.health; $('#level').textContent = `${hud.level} · AUTO ${attackEnabled ? 'ON' : 'OFF'} · ${speed}×`;
    $('#timer').textContent = hud.timer; $('#score').textContent = hud.score; $('#combo').textContent = hud.combo;
    $('#ability-hint').textContent = hud.ability;
  }

  showToast(message, seconds = 1.2) { this.nodes.toast.textContent = message; this.nodes.toast.classList.remove('hidden'); this.toastTimer = Math.max(this.toastTimer, seconds); }
  update(dt) { if (this.toastTimer > 0 && (this.toastTimer -= dt) <= 0) this.nodes.toast.classList.add('hidden'); }
  hideOverlays() { for (const node of [this.nodes.title, this.nodes.draft, this.nodes.pause, this.nodes.end, this.nodes.transition]) node.classList.add('hidden'); }
}
