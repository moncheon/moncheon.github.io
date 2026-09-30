# runmoon · 런문

작은 친구들과 호숫가를 산책하는 무료 힐링 웹게임입니다.

**홈페이지: https://moncheon.github.io/**

## 경험
- 친구를 선택하고 아래쪽 잔디를 클릭/터치하면 이동하고 꽃이 피어납니다.
- 친구 버튼에 초점을 둔 뒤 방향키로도 이동합니다.
- 제한 시간, 경쟁, 자동 재생 소리 없이 잠시 쉬어 가는 공간입니다.
- 다시 산책 버튼으로 초기화합니다. 새로고침하면 기록이 사라집니다.
- 왼쪽 위 메뉴에서 사업자 정보와 개인정보처리방침으로 이동합니다.
- `privacy.html` 독립 페이지는 새로고침과 뒤로가기를 지원합니다.
- 외부 글꼴/광고/분석/쿠키/웹 저장소를 사용하지 않으며 모션 감소 설정을 존중합니다.

## 실행과 점검
HTML, CSS, Vanilla JavaScript, 인라인 SVG. 설치/빌드 과정이 없습니다.

```sh
python3 -m http.server 8080
node --check script.js
python3 check_site.py
```

브라우저 점검: `manual-qa.md`.

## 배포
기존 `.github/workflows/static.yml`이 main/master 변경 시 GitHub Pages에 전체 정적 저장소를 배포합니다. Settings → Pages의 소스는 GitHub Actions를 사용합니다. 루트 `index.html`, `.nojekyll`을 유지합니다. `meetplace/`, `e1/`은 별도 기존 프로젝트이며 수정하지 않습니다.

과거 문서의 `runmoon.github.io`는 이 저장소의 Pages 주소가 아닙니다. 올바른 주소는 **https://moncheon.github.io/** 입니다. 404 발생 시 주소와 Actions 배포 결과를 확인합니다.

## 사업자 정보 확정 후 게시
현재 상호는 runmoon(런문), 사업자등록은 준비 중입니다. 대표자, 사업자등록번호, 통신판매업 신고번호, 공개 사업장 주소, 고객 문의 전화/이메일, 개인정보 문의 창구를 확정한 뒤 index.html 하단과 privacy.html을 함께 갱신합니다. 미확정 번호/주소/연락처를 임의로 게시하지 않습니다. 기존 privacy@runmoon.com 주소도 운영 여부가 확인되지 않아 사용하지 않습니다.

현재 판매/결제/회원가입은 없습니다. 준비 중 고지는 판매 사이트의 법정 고지 완비를 의미하지 않습니다. 판매 전 사업 형태에 맞는 고지와 정책 검토가 필요합니다. 개인정보 안내의 적용 범위는 루트 산책 게임입니다.

© 2026 runmoon. All rights reserved.
