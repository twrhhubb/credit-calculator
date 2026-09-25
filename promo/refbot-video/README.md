# REFBOT — промо-видео мини-приложения

`refbot-miniapp.mp4` — 1080×1080 (1:1), H.264, 60 fps, 42 с.

Сцены: логотип → «Бот стал удобнее» → 5 разделов (Маршруты, Справочник, Заявка,
Личный кабинет, Новости) → туториал «Как открыть» (@refagrobot → кнопка запуска) → финал.

## Как пересобрать

- `scene.html` — вся анимация; кадр задаётся функцией `render(t)`, тайминги в `F`, `TUT`, `OUT`.
- `refagro-white.png`, `refagro-blue.png`, `refagro-mark.png` — логотип REFAGRO (белый, в цвете #245A7E и знак).
- `fonts/` — Manrope.

```bash
# превью-кадры
node render.mjs --stills 2,8,20,34 ./stills
# полный рендер (нужен ffmpeg с libx264; путь можно задать через FFMPEG=...)
node render.mjs refbot-miniapp.mp4
```
