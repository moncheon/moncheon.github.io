'use strict';
const toggle = document.querySelector('#menuToggle');
const menu = document.querySelector('#menu');
if (toggle && menu) {
  function closeMenu(restoreFocus = false) {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '메뉴 열기');
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.setAttribute('aria-label', opening ? '메뉴 닫기' : '메뉴 열기');
    if (opening) menu.querySelector('a').focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
  document.addEventListener('focusin', event => {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) closeMenu();
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
}
const world = document.querySelector('#world');
if (world) {
  const friends = [...world.querySelectorAll('.friend')];
  const names = ['구름이', '복숭이', '풀잎이'];
  const initial = [{x:43,y:79},{x:53,y:85},{x:63,y:77}];
  const flowers = document.querySelector('#flowers');
  const status = document.querySelector('#status');
  const destination = document.querySelector('#destination');
  let selected = 0;
  let steps = 0;
  let positions = [];
  function select(index) {
    selected = index;
    friends.forEach((friend, i) => {
      friend.classList.toggle('selected', i === index);
      friend.setAttribute('aria-pressed', String(i === index));
    });
    status.textContent = `${names[index]}와 함께 산책 중 · 걸음마다 작은 꽃이 피어나요`;
  }
  function render(index) {
    friends[index].style.left = `${positions[index].x}%`;
    friends[index].style.top = `${positions[index].y}%`;
  }
  function reset() {
    positions = initial.map(position => ({...position}));
    friends.forEach((_, index) => render(index));
    flowers.replaceChildren(); steps = 0; select(0);
  }
  function move(x, y) {
    const margin = Math.max(6, 34 / world.clientWidth * 100);
    x = Math.max(margin, Math.min(100 - margin, x));
    y = Math.max(76, Math.min(94, y));
    const current = positions[selected];
    if (Math.hypot(current.x - x, current.y - y) < 1) return;
    const flower = document.createElement('span');
    flower.className = 'flower';
    flower.textContent = ['✿','✾','❀'][steps % 3];
    flower.style.left = `${current.x}%`; flower.style.top = `${current.y}%`;
    flowers.append(flower);
    if (flowers.children.length > 24) flowers.firstElementChild.remove();
    positions[selected] = {x,y}; render(selected); steps++;
    destination.style.left = `${x}%`; destination.style.top = `${y}%`;
    destination.classList.remove('visible'); void destination.offsetWidth; destination.classList.add('visible');
    status.textContent = `${names[selected]}의 작은 산책 · ${steps}걸음, 꽃 ${Math.min(steps,24)}송이${steps % 5 === 0 ? ' · 잠깐 쉬어 가도 좋아요' : ''}`;
  }
  friends.forEach((friend, index) => {
    friend.addEventListener('click', event => { event.stopPropagation(); select(index); });
    friend.addEventListener('keydown', event => {
      const delta = {ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-4],ArrowDown:[0,4]}[event.key];
      if (!delta) return;
      event.preventDefault();
      if (selected !== index) select(index);
      move(positions[index].x + delta[0], positions[index].y + delta[1]);
    });
  });
  world.addEventListener('click', event => {
    const bounds = world.getBoundingClientRect();
    const y = (event.clientY - bounds.top) / bounds.height * 100;
    if (y < 69) { status.textContent = '호수는 눈으로 즐겨요. 아래쪽 잔디를 눌러 산책해 주세요.'; return; }
    move((event.clientX - bounds.left) / bounds.width * 100, y);
  });
  document.querySelector('#reset').addEventListener('click', reset);
  reset();
}
