# 지도 데이터 출처

- 원본: Protomaps 일일 Planet PMTiles `20260829.pmtiles`
- 데이터: © OpenStreetMap contributors, ODbL
- 추출 도구: `go-pmtiles` 1.31.2
- 범위: 서울 강동 및 대전 유성 (`maps/meetplace-regions.geojson`)
- 최대 줌: 15
- SHA-256: `e0b64000b015ac22ca151a5b89126298c3f234896398c0f5151cfca43c9ff8f6`

`meetplace.pmtiles`는 위 두 지역만 포함하는 정적 벡터 타일입니다. 지도 앱은 이 범위 밖의 타일이나 경로 데이터를 요청하지 않습니다.

검토한 `go-pmtiles_1.31.2_Windows_x86_64.zip`을 별도로 내려받아 공식 SHA-256을 확인한 뒤 다음처럼 재생성합니다.

```powershell
pmtiles extract https://build.protomaps.com/20260829.pmtiles public/maps/meetplace.pmtiles `
  --region=maps/meetplace-regions.geojson --maxzoom=15 --download-threads=1 --overfetch=0.2
pmtiles verify public/maps/meetplace.pmtiles
```
