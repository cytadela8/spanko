# Spanko

Zegar przypominający o spaniu i gra o pilnowaniu obozowiczów.

## Kod źródłowy

Pliki w `dist/` są kodem źródłowym projektu: HTML, CSS i JavaScript. Są obsługiwane bezpośrednio przez przeglądarkę — nie ma osobnego kompilatora, bundlera ani katalogu `src/`. W `tests/` znajdują się testy logiki gry. `.openai/hosting.json` to konfiguracja wdrożenia istniejącej witryny w Sites.

## Uruchomienie

Uruchom serwer w katalogu `dist`, np. `python3 -m http.server --directory dist`, i otwórz http://localhost:8000/.

Testy: `node --test tests/game-core.test.cjs`.
