# Neon District 5.0 — Codex 기술 검토

[공유 로드맵](./NEON_DISTRICT_5_ROADMAP.md)을 현재 코드 및 GLB 파일과 비교한 검토입니다. **이번 변경은 협업 문서와 오프라인 자산 검사 도구뿐이며, 도시 구현이나 M0 성능 측정 완료 보고가 아닙니다.**

## 상태

- [x] ChatGPT 계획 패키지 확인
- [x] Codex 현재 코드·모델 검증
- [ ] 소유자 M0/M1 구현 범위 확정
- [ ] M0 동일 조건 화면·성능 측정
- [x] 검토용 브랜치 준비: `codex/neon-district-5-review`
- [ ] M0 구현 PR (이번 문서 PR과 별개)

**검토일:** 2026-11-08
**검토 기준:** `c2940a0583bfbc439495de425c6e030fde577113` — 패키지 기준과 일치.
**검토 파일:** `docs/{app,city,city-life,navigation,neon4-loader}.js`, `docs/index.html`, `docs/styles.css`, `tests/verify.mjs`, Three.js revision, 34개 GLB와 건물 manifest. 아래 줄 번호는 이 기준 커밋의 번호입니다.

## 1. 확인된 사실과 로드맵 보완

| 관찰 | 근거 | 영향 / 제안 |
|---|---|---|
| 도시 탐험 정체성과 Market / Plaza / Skyrail 유지 | `index.html:28`, `navigation.js:11`, `app.js:35` | 도착 시 팝업을 열지 않는 현재 동작 유지. 남아 있는 dialog DOM과 이벤트는 다음 정리 작업의 대상이지 다시 살릴 기능이 아님. |
| 54명·21대·4대는 기본 설정값이며 compact는 22명·9대·2대 | `city-life.js:8,106`, `app.js:145` | canvas dataset은 초기 설정값을 기록할 뿐 실제 로드·화면 내 가시 수를 나타내지 않음. loadedPeople/loadedVehicles getter는 있지만 city 반환값으로 노출하지 않음. |
| 건물 카운터는 15개 주 건물만 집계 | `city.js:103–125,140–145,228–240` | 랜드마크·소품·텍스처·사람·차량을 포함한 전체 로딩 완료 판정이 아님. manifest 실패도 개별 failed 카운터와 구별해야 함. |
| 모든 34개 GLB, 522개 primitive에 NORMAL 없음 | [자산 검사 결과](./ASSET_AUDIT.json), `neon4-loader.js:95` 부근 | 로더는 비인덱스화 후 면 노멀 생성. 곡면도 각져 보일 수 있음. 노멀을 제대로 내보내는 자산 제작 과정이 필요하며, 공식 로더 교체만으로 원본 노멀이 생기지는 않음. |
| 모든 GLB에 skins=0, animations=0 | 동일 자산 검사 | 현재 사람은 스킨 애니메이션이 아닌 분리된 팔·다리 메시를 회전. `prepBones`라는 이름도 실제 skeleton을 뜻하지 않음. |
| HTTP 실패 Promise가 cache에 남음 | `neon4-loader.js:121–127` | 같은 페이지에서 재요청해도 같은 실패 반환. 사람 4종 / 차량 6종은 각각 Promise.all이라 한 종류 실패 시 해당 그룹 생성 전체가 중단됨 (`city-life.js:31,49`). 개별 실패 분리와 명시적 retry 정책 필요. |
| 모델 Promise 완료와 이미지 decode 완료가 다름 | `neon4-loader.js:48` 부근 | TextureLoader를 기다리지 않고 scene 반환. loaded 모델 수만으로 스크린샷 준비를 판단하면 안 됨. |
| Motion off에서 비동기 자산 도착 후 재렌더 요청 없음 | `app.js:141`, `city.js:113–125,263–270` | 코드상 초기 프레임 뒤 로드된 모델이 다음 입력까지 안 보일 가능성. M0 브라우저 재현 대상으로 등록하며 재현 완료로 간주하지 않음. |
| 클릭 판정은 바닥 평면과 nearStreet 검사 | `city.js:273–275` | 건물에 가려진 도로도 선택될 수 있음. 현재 'visible road' 안내가 실제 occlusion 판정과 같지 않음. |
| 길찾기와 실제 장애물 충돌은 별개 | `navigation.js:16–30,82–117` | 도로·광장 mask만 사용. 벤치·나무·기둥의 실제 충돌은 없음. 현재 테스트 통과를 '모든 장애물 충돌 검증'으로 표현하지 말 것. |
| 이동 가속/감속은 구현되어 있지 않음 | `app.js:113,123–125` | 클릭 이동은 초당 72 unit의 일정 속도, 부드러운 보간은 시선에만 적용. 코너와 재지정 경로의 실제 체감은 M0에서 확인. |
| 방향키 처리가 window 범위 | `app.js:86–95` | 본문/링크에 포커스가 있어도 스크롤을 막고 도시를 움직일 수 있음. 키보드 접근성 회귀 항목에 포함. |
| 신호등은 장식, 교통은 독립 루프 | `city.js:159–164`, `city-life.js:78–96` | stop/turn/양보/횡단 동기화는 아직 없음. 도로를 공유하는 상태 모델이 필요. |

텍스처 경로는 이미 `assets/`로 수정되어 있습니다. 초기 설치 파일의 `assets/neon3/` 오류는 현재 코드에 없습니다. 로컬의 untracked `assets/neon3/`, `materials.js`, `vendor/Reflector.js`는 이번 검토 브랜치에 넣지 않았습니다.

자산 합계는 **8,199,688 bytes, 원본 메시 65,984 triangles, 522 primitives**입니다. 이는 각 파일을 한 번씩 합한 오프라인 수치로, 복제된 도시 전체의 삼각형·draw call·VRAM·FPS 수치가 아닙니다. 원본 자산의 출처를 '사용자 제공 패키지'로 기록할 수는 있지만, 파일만 보고 권리 관계를 독립적으로 보증할 수는 없습니다.

## 2. 엔진과 모델 파이프라인

Three.js는 `docs/vendor/three.module.js:6`의 **r170**입니다. 엔진 교체나 버전 업그레이드보다 같은 버전의 공식 로더를 별도 fixture 페이지에서 비교하는 편이 작고 되돌리기 쉽습니다.

공식 [r170 GLTFLoader 소스](https://github.com/mrdoob/three.js/blob/r170/examples/jsm/loaders/GLTFLoader.js)를 확인했습니다. `three`와 `../utils/BufferGeometryUtils.js` 의존성이 있으므로 GLTFLoader 파일만 복사해서는 안 됩니다. 같은 릴리스의 의존 파일·MIT 고지를 보관하고, 상대 import 또는 import map으로 기존 Three 모듈 하나에 연결합니다. 스킨 캐릭터 복제는 [r170 SkeletonUtils.clone](https://github.com/mrdoob/three.js/blob/r170/examples/jsm/utils/SkeletonUtils.js)을 사용해 골격을 독립시킵니다.

**호환성 판단: 구조상 유력하지만 아직 공식 로더로 실행 비교한 결과는 없습니다.** 조사된 GLB는 glTF 2 binary이고 extensionsUsed가 비어 있습니다. 다만 현재 로더의 강제 normalScale, sampler 생략, 면 노멀 생성, 노드 이름 처리 등이 다르므로 '보이는 결과까지 동일'하다고 단정할 수 없습니다. custom loader는 metallicRoughness/occlusion 텍스처, alpha mask, skinning/clip 재생 등 일반 glTF 동작을 충분히 처리하지 않습니다.

M1은 기존 loadModel 사용처를 전부 바꾸지 않고 building_13, sedan, pedestrian_0을 fixture에서 양쪽 로더로 비교합니다. 원래 사람의 사인파 동작은 유지한 채, 별도로 직접 제작하거나 권리가 확인된 캐릭터 하나를 rig/weight paint하고 Idle·Walk·Turn 클립을 glTF로 export해 AnimationMixer로 재생합니다. 이동은 route가 담당하고 클립은 in-place로 두어 root motion 중복을 피합니다. 스켈레톤 원점·방향·미터 스케일·발 접지를 자산 계약에 명시합니다.

압축과 대규모 재구성은 후속입니다. 현재 GLB에는 압축 확장 요구가 없으므로 Draco/Meshopt/KTX2 decoder를 먼저 추가할 이유가 없습니다. 다운로드 병목과 GPU 메모리를 측정한 뒤 필요한 codec만 정합니다. 한 PR에서 로더·조명·모델·길찾기를 함께 바꾸지 않습니다.

## 3. 시작 지점에서 가장 큰 시각 개선 3가지

1. **가까운 건물 하부와 실루엣부터 제작.** 시작 위치 `(0,82)` 앞의 building_13 / building_12와 광장 반대편 building_14를 우선 대상으로, 두세 개의 구별되는 파사드와 실제 깊이의 상점·출입구·쇼윈도를 설계합니다. 건물 전체 수를 늘리지 않고 눈높이 1–3층의 반복을 먼저 줄입니다. manifest 좌표 기반 후보이며, 최종 선정은 동일 시점 비교로 확정합니다.
2. **매끄러운 노멀과 재질·접지 개선.** 곡면 차량/사람에는 올바른 smooth normals, 건축 모서리에는 의도한 hard edges를 export합니다. 도로의 균일한 젖은 느낌을 roughness 변화로 나누고, 주변광과 제한된 접지 그림자/반사의 비용을 비교합니다. bloom을 먼저 넓게 덮는 방식은 피합니다.
3. **짧은 거리에서 보이는 사람의 행동 개선.** 숫자 증가보다 한 사람의 자연스러운 보행·대기 전환, 보폭과 이동 속도 일치, 도로 횡단 대기 및 차량 정지를 우선합니다. 더 많은 정적 복제보다 살아 있는 거리 인상이 커질 가능성이 높습니다. 이는 설계 판단이며 아직 A/B 렌더로 검증한 성과가 아닙니다.

### 기존 34개 모델 처리 제안

| 파일 그룹 | 다음 단계 |
|---|---|
| building_00–14 | 전부 호환성 fixture로 보존. 12/13/14의 가까운 하부를 먼저 개선, 나머지는 중경 배치로 유지하며 독립 실루엣과 LOD를 순차 제작. |
| landmark_00–02 | 원경으로 유지. 실제 원경 기여도를 측정하기 전 교체/고해상도화하지 않음. |
| pedestrian_0–3 | 기존 비교 기준으로 보존. 새 rigged 캐릭터 1종을 먼저 검증한 뒤 단계 교체. |
| sedan, taxi, hatchback, delivery_van, bus, sport | 차선·신호 fixture로 재사용, 곡면 노멀·바퀴 pivot·방향 규약 개선. sport 기반 비행체는 별도 aerial 자산으로 나중에 교체. |
| bench, busstop, vending, planter, holo_ad | 재사용. 공유 material/geometry, 반복 인스턴싱 후보. 현재 단순 Mesh clone은 자동 instancing이 아님. |
| streetlamp | 원본 보존. 현재 도시는 procedural lamp를 사용하고 이 GLB를 요청하지 않음. 통합하거나 미사용 자산으로 표시; 즉시 삭제하지 않음. |

## 4. 사람·차량·신호 설계

- 단일 simulation clock 아래 보행자 waypoint graph와 차량 lane graph를 분리합니다. 교차로 하나에 `NS green → clearance → EW green → clearance` 상태와 횡단 허용 상태를 공유하고, 차량은 stop line 앞에서 간격을 유지하며 감속합니다.
- 보행 상태는 idle/walk/wait/cross/visit으로 명시하고, 캐릭터 AnimationMixer 전환과 경로 진행을 연결합니다. gait는 이동 속도에 비례, 화면 밖은 업데이트 빈도/LOD를 줄이는 방안을 측정합니다.
- 현재 차량은 다른 속도로 동일 직선을 돌기 때문에 추월·중첩 가능성이 있습니다. 회전부터 추가하기 전에 간격·정지·clearance 테스트를 만듭니다.
- 리소스 공유와 GPU instancing, skeletal instancing은 다른 문제입니다. 사람 수를 늘리기 전에 draw calls, 스킨 계산 및 material 분리 비용을 측정합니다. `configured / instantiated / in-frustum / failed`를 구분하고 in-frustum도 실제 가림 없는 visible 수와 동일하지 않음을 표시합니다.

## 5. 첫 구현 PR 제안: M0 진단 기반

**추천 브랜치:** `codex/nd5-m0-diagnostics` (현재 문서 PR과 별도).
**범위:** 조명·모델·이동 방식은 바꾸지 않는 opt-in 진단, 자산 readiness, 기준 화면 기록. **M1 로더 교체는 이 PR에 포함하지 않습니다.**

| 변경 예정 파일 | 역할 |
|---|---|
| `docs/diagnostics.js` (신규), `docs/app.js` | `?debug=1`에서만 진단 HUD/내보내기. 실제 rAF 시간차로 frame-time 기록, 고정 카메라/시선 preset 및 기록된 simulation 시점 재현. |
| `docs/neon4-loader.js` | fetch/parse/이미지 decode 성공·실패·pending을 구분하는 상태 계약, 준비 완료 신호. 실패 시 영원히 대기하지 않음. |
| `docs/city-life.js`, `docs/city.js` | 실제 생성 수와 실패 수, renderer.info 스냅샷 노출. 선언된 15개 건물 수를 전체 readiness로 오인하지 않음. |
| `tests/verify.mjs`, 신규 진단 테스트 | 통계·실패 경로 및 기존 회귀 검증. 필요하면 browser smoke fixture를 별도 추가. |
| `planning/baselines/` | 고정 시점과 환경·결과·실제 브라우저 캡처 기록. |

첫 PR 완료 기준:

- 진단 off일 때 도시 외관/컨트롤/노출 UI 변화 없음. GPU 자원 생성·샘플 버퍼의 불필요한 지속 비용 없음.
- 시작 / Grand Crossing / Night Market / Skyrail 네 preset에서 카메라 좌표·yaw·pitch·시간·seed·motion·quality·viewport·DPR·해상도 기록. 추천 초기 preset은 각각 `(0,82)`, `(0,-20)`, `(-48,12)`, `(0,-108)`이며 카메라 높이 2.75, yaw/pitch 0을 출발점으로 실제 구도 확인 후 고정.
- 모델·이미지 로드가 settled인 것을 확인한 뒤 캡처. timeout/부분 실패를 성공 이미지로 숨기지 않음.
- warm-up 10초 후 활성 렌더 30초 × 3회. median FPS = `1000 / median(frameMs)`, 1% low = `1000 / mean(가장 느린 1% frameMs)`로 정의. raw frame samples와 계산식을 함께 보관. `dt`는 app에서 50ms로 제한하므로 이를 FPS 계산에 쓰지 않음.
- 브라우저/버전/OS/GPU 또는 software renderer 여부/viewport/DPR/quality/전원 상태/측정 방식을 기록. 백그라운드·hidden·motion off 정지 구간은 성능 표본에서 제외하고 별도 상태로 보고.
- 같은 조건의 Chromium·Edge에서 시작, 양축 드래그/360 yaw, 카메라 상대 WASD·화살표, Shift, 클릭 이동/중도 재지정, Esc, R, 구역 버튼/지도, reduced motion, 텍스트 fallback, 터치와 resize 검사. WebGL context loss도 fallback 확인.
- fetch 한 종류 실패, 이미지 decode 실패, 느린 로드, Motion off 부팅을 재현하고 오류·누락 수가 표시되는지 검증. 사람이 모두 생성됐다는 가정으로 테스트하지 않음.
- 기존 `node tests/verify.mjs` 통과와 실제 브라우저 오류 로그·캡처 제출. GPU 성능 합격 수치는 이 PR에서 미리 보증하지 않음.

**캡처 경로:** 이 환경의 in-app browser는 배포 사이트 WebGL 화면 확인에 사용한 이력이 있습니다. 그러나 원격 브라우저를 사용자의 실제 GPU/Edge 측정값으로 간주할 수 없고, 로컬 loopback 접근 실패 이력도 있습니다. 브랜치의 로컬 HTTP 서버와 지원되는 브라우저 연결/포워딩을 먼저 확인합니다. 사용할 수 없으면 공개 main에 테스트 코드를 올려 우회하지 않고 로컬 Chrome/Edge에서 같은 fixture를 실행해 기록합니다. 브라우저 실행 또는 하드웨어 식별이 안 되는 항목은 미측정으로 남깁니다.

**위험과 롤백:** 진단 자체의 CPU 비용, 비동기 readiness 누락, Motion off 재렌더 누락, query 문자열에 따른 모듈 중복을 확인합니다. 이 문서 PR은 `docs/` 변경이 없으므로 닫거나 문서 커밋을 revert하면 됩니다. M0도 단독 PR로 두고 문제 시 해당 merge commit을 revert한 뒤 Pages 빌드를 확인합니다. 로컬 미추적 파일 삭제나 reset --hard는 사용하지 않습니다.

## 6. 이번 검토에서 실행한 검증과 미실행 항목

- **PASS:** `node tests/verify.mjs` — JS 구문, 로컬 모듈/기본 텍스처 경로, 34개 GLB 메시의 유한 좌표, 목적지 간 route 샘플 및 제한된 도로 mask 충돌. 이 테스트의 TextureLoader는 mock이므로 이미지 decode/GPU 렌더 검증이 아님.
- **실행:** `node planning/audit-assets.mjs` — GLB 헤더/JSON 인벤토리, 파일 SHA-256, bytes/primitives/triangles/normal/skin/animation 기록. 범용 glTF 규격 validator는 아님. 재실행 시 report의 baseline은 실행한 HEAD로 갱신됨.
- **미실행:** 공식 GLTFLoader 교체 비교, rigged fixture, 새 브라우저 기준 캡처, GPU 식별, FPS·draw calls·texture memory, Chromium/Edge 교차 검증. 따라서 M0/M1 완료나 성능 개선을 주장하지 않음.
- **이번 변경:** 원본 roadmap/AGENTS/협업 템플릿 수록, 이 기술 검토 및 오프라인 audit 도구·결과 작성. 사이트 소스와 자산은 변경하지 않음. 설치용 Python 실행은 필요하지 않아 ZIP의 개별 문서를 기존 파일 충돌 확인 후 직접 배치함.

## 7. 소유자가 정할 사항 (최대 3개)

1. 다음 구현을 **M0 측정만 먼저 진행**하는 범위로 확정할지. 추천: 측정 PR → M1 별도 prototype → M2 첫 구역.
2. 첫 근거리 리모델링 구역을 **시작 지점–광장 앞 120×120 범위**로 할지. 추천: 같은 화면에서 전후 차이를 보기 쉬운 이 범위부터.
3. 캐릭터 제작은 **직접 제작한 1종**으로 시작할지, 출처/라이선스가 명확한 외부 자산 후보를 검토할지. 별도 구매·다운로드는 이번 범위에 없음.

## 로드맵 대비 변경 사유

M0와 M1을 하나의 큰 PR로 묶지 않고 분리합니다. 누락된 노멀·리깅은 로더만으로 해결되지 않으며, 먼저 측정 기준을 고정해야 렌더 차이와 비용을 평가할 수 있기 때문입니다. 기존 밤 도시 정체성, 60/25/15 디자인 비중, 조작과 static Pages 요구는 유지합니다.
