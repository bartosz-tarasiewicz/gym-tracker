# Gym Tracker — v0.5 · Azure Primary · trening wybierany datą

PWA na iPhone i Windows (HTML/CSS/JS, bez etapu kompilacji). Hosting: Azure Static Web Apps. Historia treningów i sesje w Azure Table Storage, z lokalnym buforem do pracy offline. Zakres testów i infrastruktury jest opisany w `docs/AZURE_AUTHORITY_V04.md`.

## Jak korzystać

1. W zakładce **Trening** wybierz datę w kalendarzu tygodniowym **Pon–Nd**; strzałki przesuwają tydzień, „Dziś” wraca do aktualnej daty, a pole daty umożliwia skok.
2. Jeśli tego dnia istnieje trening, formularz otwiera **istniejący wpis do edycji** i zachowuje jego `syncId`. Jeżeli go nie ma, wyświetla niewykonane serie z proponowanym ciężarem i liczbą powtórzeń.
3. Wybieraj alternatywną maszynę, hantle lub wyciąg z widocznych przycisków; każdy wariant ma osobne serie. Przy powtórzeniach działają przyciski **− / +**.
4. Potwierdź serię przyciskiem ✓. Zmiany oraz korekty wpisów są zapisywane automatycznie; **nie trzeba kończyć treningu**. Niewykonane wartości domyślne nie tworzą rekordu w Azure.
5. **CORE BONUS** ma 10 opcjonalnych ćwiczeń ze zdjęciami poglądowymi i źródłami. Czwartek (GRIT) oraz sobota/niedziela nie są rejestrowane.
6. W **Progresie** wybierz ćwiczenie, wariant sprzętu, ciężar/powtórzenia/objętość i liczbę ostatnich treningów. Wykres bazuje wyłącznie na wykonanych seriach z zakończonej historii i autosave'owanych sesji.

**Bezpieczeństwo danych:** w Azure istnieje odrębny rekord per `draft:YYYY-MM-DD-day` lub `history:id` (zachowany format v0.4). Nawigacja po datach nie wysyła pustych treningów. Korekta historycznego wpisu aktualizuje ten sam rekord z ochroną ETag. Nie ma automatycznego usuwania istniejących rekordów i nie ma migracji schematu bazy. Lokalny IndexedDB/localStorage to bufor pracy offline, nie druga „główna baza”.

**Zdjęcia:** zdjęcia ćwiczeń CORE są osadzone z zewnętrznych źródeł; jeśli serwis źródłowy blokuje wyświetlenie, może pojawić się komunikat o niedostępności. Zawsze widać tytuł ćwiczenia i źródło obrazu.

## Historia wersji
- v0.5: kalendarz Pn–Nd na ekranie Trening, edycja wybranego dnia, przywrócone warianty, CORE photo, trendy.
- v0.4: Azure-authoritative per-workout records, ETag i kolejka offline.

---

## Starsze informacje (archiwalne)


Lekka PWA na iPhone i Windows: czysty HTML/CSS/JavaScript, bez React i bez etapu kompilacji. Jest to aktualizacja pliku `gym-tracker-mvp(1).zip` użytkownika.

## Co jest gotowe

- Tygodniowy plan hipertrofii: klatka, plecy, barki/biceps/triceps, GRIT, alternatywny czwartek siłowy, nogi/pośladki.
- 10 opcjonalnych ćwiczeń **CORE BONUS**, każda po 2 serie, osobne od ćwiczeń głównych.
- Domyślne kilogramy i powtórzenia, jednostki talerze razem / na stronę / stos / jeden hantel / sekundy na stronę.
- Rozgrzewki poza licznikiem serii roboczych, RIR, dodanie kolejnych serii, zmiana wariantu sprzętu bez nadpisywania serii poprzedniej maszyny.
- **Automatyczne zapisywanie** zmian: natychmiastowy zapis do `localStorage` + zapis do IndexedDB; status w prawym górnym rogu.
- Zakończony trening → Historia; niedokończony trening też jest zachowany lokalnie.
- Eksport JSON (pełna kopia), CSV (potwierdzone serie, również z aktywnych sesji), import JSON oraz awaryjny raport tekstowy.
- Obsługa historii starego MVP: zachowane nieznane / zmienione identyfikatory ćwiczeń jako „Ćwiczenie archiwalne”, zamiast ich pomijania w raporcie.
- Service worker i plik `staticwebapp.config.json` do hostingu w Azure Static Web Apps.

## Jak uruchomić i przetestować lokalnie

Rozpakuj archiwum. W tym katalogu wykonaj:

```bash
python -m http.server 8080
```

Otwórz `http://localhost:8080` w przeglądarce. Na Windows, jeśli nie ma Pythona, można użyć `npx serve .` (wymagany Node.js). Nie testuj zapisów przez dwuklik `index.html` (`file://`), bo IndexedDB/PWA mogą mieć inne ograniczenia.

**Test obowiązkowy przed prawdziwym treningiem:** wybierz ćwiczenie, zmień kg/powtórzenia, potwierdź serię, odśwież stronę, sprawdź zachowanie wpisów. Następnie Dane → Eksport JSON i sprawdź, czy pobiera się kopia.

## Publikacja na Azure Static Web Apps (przez GitHub)

1. Rozpakuj ZIP na komputerze. Utwórz nowe repozytorium w GitHub (prywatne lub publiczne); prześlij **pliki z wnętrza ZIP-a do katalogu głównego repozytorium**, nie sam ZIP i nie dodatkowy folder.
2. Wejdź na <https://portal.azure.com>, wyszukaj **Static Web Apps** → **Create**.
3. Wybierz subskrypcję i grupę zasobów (możesz utworzyć nową), nadaj nazwę np. `bart-gym-tracker`, plan **Free**, wybierz region dostępny w swojej subskrypcji.
4. `Deployment source: GitHub` → zaloguj się/autoryzuj GitHub → wskaż repozytorium i gałąź `main`.
5. Build details: preset **Custom** (lub HTML, gdy interfejs go oferuje); **App location:** `/`; **API location:** pozostaw puste; **Output location:** pozostaw puste. Nie ustawiaj kroku build — aplikacja jest statyczna.
6. Kliknij **Review + create** → **Create**. Azure utworzy workflow GitHub Actions. Gdy deploy się zakończy, w zasobie otwórz wskazany adres `https://...azurestaticapps.net`.
7. W Safari na iPhonie: Udostępnij → **Dodaj do ekranu początkowego**. Zapisuj kolejne sesje z tej samej instalacji / domeny.

Jeśli Azure zgłosi, że brak procesu budowania lub niewłaściwy folder, sprawdź w workflow GitHub Actions: `app_location: '/'`, `api_location: ''`, `output_location: ''`, a sam `index.html` powinien leżeć w katalogu głównym repozytorium.

## Bardzo ważne: ograniczenia i prywatność

- **To NIE jest synchronizacja z Azure.** W tej wersji Azure hostuje pliki. Dziennik pozostaje na konkretnym urządzeniu i w jego pamięci przeglądarki. To celowo prosty pierwszy etap. Dopiero backend Azure Functions + Table Storage/Cosmos DB + uwierzytelnienie doda synchronizację.
- **Kopia miejscowa to nie kopia zewnętrzna.** IndexedDB i `localStorage` mogą zostać razem usunięte, np. podczas wyczyszczenia danych witryny; regularnie eksportuj JSON i przechowuj kopię poza urządzeniem. Zapisy mogą zniknąć także po zmianie domeny.
- Strona w planie Free nie wymaga logowania i ma publiczny adres. Inni mogą wejść na stronę, ale **nie widzą Twoich lokalnych wpisów z Twojej przeglądarki**. Nie dodawaj prywatnych informacji do samego repozytorium.
- Zdjęcia dostępne dla niektórych maszyn ładują się z zewnętrznych serwisów. Jeśli danej fotografii brak, aplikacja pokazuje etykietę; zdjęcia nie są kompletne i nie muszą działać offline.
- Nie ma połączenia z ChatGPT ani automatycznego przesyłania tu logów. Eksport JSON/CSV można przesłać do analizy w rozmowie.
- Nie zaimportowano automatycznie treningów z czatu; kopie użytkownika należy dodać osobno, unikając duplikatów.

## Pliki

- `index.html` — UI
- `app.js` — plan, core, logowanie, historia, eksport
- `storage.js` — IndexedDB + localStorage i status zapisu
- `sw.js` — offline PWA shell
- `manifest.webmanifest`, ikony — instalacja PWA
- `staticwebapp.config.json` — konfiguracja hostingu Azure
