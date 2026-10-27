# Spanko

Statyczny przypominacz o spaniu i gra o pilnowaniu obozowiczów.
Zwykły HTML, CSS i JavaScript — bez kompilacji, bundlera i minifikacji.

## Uruchomienie

```sh
python3 -m http.server --directory public 8000
```

Otwórz http://localhost:8000/. Przeglądarka uruchamia bezpośrednio pliki źródłowe.

## Struktura

- `public/index.html` — strona i szablon interfejsu gry (`gameTemplate`).
- `public/css/main.css` — wygląd przypominacza.
- `public/css/game.css` — wygląd i układy responsywne gry.
- `public/js/app.js` — zegar, pory dnia, komunikaty i interakcje przypominacza.
- `public/js/audio.js` — dźwięki Web Audio.
- `public/js/game-core.js` — zasady gry, tempo, punktacja, geometria i trafianie w pokoje; bez DOM.
- `public/js/game.js` — renderowanie gry, przeciąganie, pauza, pełny ekran i rekord.
- `tests/game-core.test.cjs` — testy uruchamiane wbudowanym runnerem Node.js.
- `.openai/hosting.json` — konfiguracja istniejącej witryny Sites, serwującej kopię katalogu `public/`.

## Zmiany i testy

Edytuj bezpośrednio odpowiedni plik w `public/` i odśwież stronę.
Nie ma wygenerowanej kopii kodu ani kroku budowania.

```sh
node --test tests/game-core.test.cjs
```

`.editorconfig` ustala wcięcia i zakończenia linii. Opcjonalnie możesz
sformatować kod Prettierem (nie jest potrzebny do uruchomienia strony):

```sh
npx --yes prettier@3.6.2 --write public tests README.md .prettierrc.json
```

Kod na GitHubie i wdrożenie Sites są synchronizowane oddzielnie.

## Publikacja w Sites

Sites wymaga katalogu `dist/`. Przed publikacją uruchom:

```sh
node scripts/prepare-sites.mjs
```

Skrypt kopiuje pliki z `public/` do ignorowanego przez Git katalogu `dist/`, bez przekształceń. Nie kompiluje ani nie minifikuje kodu. Lokalna praca i uruchamianie strony nie wymagają tego kroku.
