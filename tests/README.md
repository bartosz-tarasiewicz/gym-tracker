# Testy Gym Tracker

## Uruchamianie

Node 22 lub nowszy. Testy nie wymagają konta Azure i nie zmieniają prawdziwych treningów.

```sh
npm ci
npm ci --prefix api
npx playwright install chromium webkit
npm test
npm run test:report
```

`npm test` uruchamia nowy zestaw Playwright Test, istniejące scenariusze synchronizacji dwóch urządzeń w Playwright oraz testy API/katalogu. `npm run test:ui` uruchamia tylko nazwane scenariusze UI. `npm run test:cloud` uruchamia synchronizację i import/eksport.

Dodatkowy projekt Safari: ustaw `GYM_WEBKIT=1`. Na Windows można użyć zainstalowanego Edge: `$env:GYM_BROWSER_CHANNEL='msedge'`. GitHub Actions uruchamia Chromium (telefon + komputer) oraz WebKit (iPhone). Emulacja nie zastępuje sprawdzenia fizycznego iPhone'a, jego paska systemowego i instalacji z ekranu głównego.

Raport HTML: `playwright-report/index.html`. Przy błędzie zachowujemy screenshot, stan strony i trace z akcjami oraz siecią. Raporty CI są dostępne przez 14 dni w artefakcie `playwright-report`. Testy nie ponawiają się automatycznie: pierwsza awaria jest widoczna. Każdy nowy scenariusz ma własny serwer, bazę i kontekst przeglądarki. Starszy zestaw cloud jest sekwencyjnym testem integracyjnym.

## Mapa funkcji i testów

| Funkcjonalność | Scenariusze / pliki |
| --- | --- |
| Profile: dodawanie, anulowanie, walidacja, bez okien prompt | `features.spec.mjs`: profiles; `cloud-e2e.mjs`: Profiles |
| Przełączanie, niezależne treningi/ustawienia, równoczesne karty | `cloud-e2e.mjs`: Profiles isolate same-date workouts, plans, filters, export/import, cache and parallel tabs |
| Istniejące dane domyślnego profilu, import starszych formatów | `cloud-e2e.mjs`: legacy additive JSON, full export with multiple same-date records, 13 November |
| Kalendarz: tygodnie, przełom roku, konkretna data, dziś, oznaczenia | `features.spec.mjs`: calendar; `cloud-e2e.mjs`: Calendar, workout overrides |
| Rodzaj treningu, wolne, GRIT, inna aktywność i notatki | `cloud-e2e.mjs`: Date-level rest, GRIT and weekends, cross-device persistence |
| Ćwiczenia: nawigacja, warianty, fotografie, opis, brak zdjęcia | `features.spec.mjs`: uniform exercise layout, exercise navigation, catalogue, images; `cloud-e2e.mjs`: Dumbbell photos; `azure-e2e.mjs`: independent variants |
| Serie robocze/rozgrzewki: edycja, potwierdzanie, RIR, +/- | `features.spec.mjs`: sets, warmups and core; `cloud-e2e.mjs`: restored leg workout |
| Dodanie serii, limit 15, potwierdź wszystkie, puste powtórzenia | `features.spec.mjs`: sets |
| Opcjonalny CORE, sekundy, włączenie/wyłączenie, przetrwanie odświeżenia | `features.spec.mjs`: warmups and core, catalogue core; `azure-e2e.mjs`: CORE BONUS |
| Zapis jawny, aktualizacja tego samego ID, wiele wpisów jednego dnia | `cloud-e2e.mjs`: save and overrides, full export, 13 November |
| Cofnij zmiany, anulowanie opuszczenia edycji, odrzucenie zmian | `cloud-e2e.mjs`: Undo; `features.spec.mjs`: historical edit |
| Awaria zapisu, ponowienie, konflikt ETag, brak logowania | `features.spec.mjs`: failed cloud save, ETag conflict, signed out |
| JSON/CSV: pobranie i zawartość eksportu, import bez utraty innych dni | `cloud-e2e.mjs`: JSON export, CSV export, import upserts, roundtrip |
| Import: stabilny wybór pliku podczas synchronizacji, idempotencja, anulowanie, zły JSON/format/data/ID/typ | `cloud-e2e.mjs`: repeated import, legacy notes; `features.spec.mjs`: import rejects, import cancellation, import file picker |
| Progres: tylko potwierdzone serie, metryki, zakres, wykres, puste wyniki | `features.spec.mjs`: progress; `cloud-e2e.mjs`: profile filters; `azure-e2e.mjs`: progress |
| Lokalne przechowywanie i praca offline | `features.spec.mjs`: offline PWA; `azure-e2e.mjs`: localStorage and IndexedDB |
| Brak cache prywatnych API i autoryzacji | `features.spec.mjs`: offline PWA; testy API anonimowego dostępu |
| Układ telefonu, safe-area, pasek dolny, brak przewijania poziomego | `features.spec.mjs`: mobile layout; `cloud-e2e.mjs`: mobile safe area |

`features.spec.mjs` znajduje się w `tests/ui/`. Wspólny kontrolowany serwer znajduje się w `tests/helpers/server.mjs`. Dane testowe są syntetyczne. Opcjonalny `GYM_TEST_EXPORT` pozwala lokalnie sprawdzić plik użytkownika; nie jest używany w CI ani dołączany do repozytorium.

## Granice automatyzacji

To pokrycie funkcji, nie deklaracja 100% wszystkich kombinacji danych lub linii kodu. W testach lokalnych API Azure jest kontrolowane; osobne testy API sprawdzają izolację profili, uprawnienia i zapis warunkowy. Istniejące `azure-e2e.mjs` oraz workflow post-deploy sprawdzają prawdziwą publiczną aplikację anonimowo. Logowania do zewnętrznego GitHub, sprzętowego safe-area i rzeczywistych awarii infrastruktury nie udajemy testami mocka. Nazwany test konfliktu wymusza odpowiedź HTTP 409; nie zastępuje testów API porównujących ETag.

Przy dodawaniu funkcji należy dopisać scenariusz UI i pozycję do tej mapy, a przy poprawce błędu — scenariusz odtwarzający błąd. Oczekiwania należy opierać na zachowaniu użytkownika i zapisanych danych, a nie wyłącznie obecności przycisku.

W scenariuszu offline Chromium przełączamy w tryb bez sieci i przeładowujemy stronę z rzeczywistego cache. Automatyzowany WebKit potrafi odrzucić taką nawigację błędem wewnętrznym silnika, zanim obsłuży ją service worker (potwierdzone na Windows i Linux). W WebKit sprawdzamy komplet cache, edycję bez sieci i zachowanie wyników po powrocie połączenia oraz przeładowaniu. Raport testu zawiera adnotację o tej granicy pokrycia. Pełne uruchomienie offline na fizycznym Safari pozostaje sprawdzeniem ręcznym.

Modele danych planów: `tests/plans.test.cjs` weryfikuje niezależną kopię planu przy treningu, zgodność starych wpisów i odrzucanie uszkodzonych definicji. Model jest podłączony do edytora i zapisu treningów. `tests/ui/plans.spec.mjs` sprawdza dodawanie ćwiczeń, kolejność, ustawienia serii, walidację, anulowanie, tydzień treningowy, kopie planów w treningach, historię, usuwanie, import/eksport, izolację profili, drugi sprzęt, zapis bez połączenia i granicę pojemności.
