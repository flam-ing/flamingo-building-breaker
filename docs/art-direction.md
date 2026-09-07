# 원화 / 프롬프트 세트

## 제작 경로

아래 세 PNG는 모두 2026-09-07 **내장 image_gen 도구**로 새로 생성하고 출력 원본을 프로젝트로 복사했습니다. CLI/API 대체 경로, 원작 참고 캡처 입력, 원작 SWF 추출, 기존 프랜차이즈 스프라이트를 사용하지 않았습니다. 원작은 시각 분석용으로만 보고 새 텍스트 지시를 작성했습니다.

| 자산                                         | 크기          | 실제 용도                                          |
| -------------------------------------------- | ------------- | -------------------------------------------------- |
| [swordsman.png](../public/art/swordsman.png) | 1774×887 RGBA | 같은 플라밍고 검객의 4×2 키 포즈, 실제 투명 알파   |
| [facades.png](../public/art/facades.png)     | 1536×1024     | 세 가로 층 스트립, 건물·파괴 조각에 같은 재질 사용 |
| [cityback.png](../public/art/cityback.png)   | 1672×941      | 하늘·언덕·먼 도시·공사장 배경                      |

아래는 생성에 사용한 방향을 보존한 재사용용 프롬프트 세트입니다. 원본 채팅 프롬프트의 바이트 단위 로그가 아니라 자산별 제작 지시를 정리한 것입니다.

## 1. 투명 플라밍고 검객 스프라이트

```text
Use case: stylized-concept.
Asset: original 2D action-game sprite sheet on a truly transparent background.
Create eight distinct full-body poses of the SAME original athletic flamingo
swordsman, arranged in four columns and two rows, with separation between poses.
Ivory head feathers, a long curved pink neck and hooked pink/black beak;
dark teal short martial coat, white sleeves, coral-red waist sash, charcoal
trousers, pale shin wraps and dark boots. Silver feather-point saber with a
brass hilt. All poses face right. Detailed ink outlines, strong cel shading,
clear weight-bearing feet, convincing sword grips and dynamic joint poses.
Row one: ready stance with sword down-right; full horizontal slash; rising
overhead slash with raised knee; low guard with sword overhead.
Row two: recoil from a hit; compressed charged stance; airborne descending
finishing slash; relaxed victorious pose with sword resting on shoulder.
Maintain character identity, proportions and scale across all eight poses.
No words, labels, background, ground shadow, logos or existing franchise hero.
Preserve actual transparent alpha, not a checkerboard illustration.
```

## 2. 세 가지 모듈 건물 층

```text
Use case: stylized-concept.
Asset: three horizontal modular building-floor strips for a cel-illustrated
2D demolition action game, stacked in three clearly separated full-width rows.
Straight-on facade, not perspective, no characters or UI.
Top row: warm concrete ledges and red brick, large dusty cyan window bays,
brass drain details and aged architectural trim.
Middle row: teal industrial steel, rivets, amber factory windows and copper
pipes, distinctly heavier than the brick building.
Bottom row: pearl concrete, aqua glass and gold mullions, crisp reflections
for a modern control tower.
Each strip must work as a repeatable floor with a readable bottom ledge.
Rich authored material detail, clean dark ink contours and cel shading.
No signs, lettering, logos, people, HUD or existing game assets.
```

## 3. 푸른 도시 철거 현장

```text
Use case: stylized-concept.
Asset: wide 16:9 original cel-illustrated background for a 2D sword demolition game.
Broad bright cyan sky with large white clouds, vivid green hills, varied distant
city silhouettes at left and right. Leave the center clear for a tall building
and a small swordsman to be composited by the game.
Concrete demolition apron along the bottom, a yellow safety line, pipe sections
and a barricade on the left, wire fence and brick pallets on the right, a distant
crane. Emphasize several distinct depth layers without cluttering the action area.
Detailed but clean painted cel art, welcoming daylight, no characters, lettering,
logos, HUD, recognizable existing game backgrounds or franchise assets.
```

## 실제 게임 연결

`sprites.mjs`는 PNG의 연결된 알파 실루엣을 찾아 각 캐릭터만 분리합니다. 8개 포즈 모두 같은 배율로 그리고, 포즈별 발 원점을 유지합니다. 이미지 안에 다른 포즈의 조각이나 체크무늬 배경이 남지 않는지 CPU 테스트와 [원점 아틀라스](previews/pose-atlas.png)로 확인합니다.

준비 자세, 타격 자세, 회복 자세는 `game.mjs`의 공격 시간과 동기화됩니다. 균열·검기·방어막·낙하 경고·파편 궤도·먼지·UI는 `paint.mjs`의 코드로 그립니다. 필살 화면을 배경 이미지 한 장으로 대체하지 않습니다. 파괴되는 18조각은 실제로 깨진 층과 같은 재질 스트립에서 잘라냅니다.

`unslop-ui`의 방향 선택에 따라 별도 포털/대시보드 래퍼 없이 게임 화면 하나를 중심으로 구성했습니다. 청색 야외 현장, 금색 방어/필살 계기판, 뚜렷한 키 포즈가 주인공입니다. 타이틀과 수치는 생성 이미지에 넣지 않고 읽을 수 있는 HTML/Canvas 텍스트로 렌더합니다.

Galmuri 11은 Lee Minseo의 폰트이며 [SIL OFL 1.1](../public/fonts/OFL.md) 아래 포함했습니다. 브라우저용 WOFF2와 CPU 캡처용 TTF를 함께 보관합니다. 효과음은 Web Audio 오실레이터로 합성한 새 짧은 음이고 원작 음악은 없습니다.
