## Wybór wpisu po imporcie starszej bazy

Gdy data zawiera starsze szkice utworzone samym przeglądaniem szablonów, ekran wybiera wpis z potwierdzonymi seriami roboczymi lub rozgrzewkowymi, zamiast pierwszego pustego szablonu. Niezapisane zmiany i jawnie wybrany wpis zachowują pierwszeństwo. Zapis wskazanego rekordu zachowuje jego ID i pozostałe rekordy z tej samej daty; nie scala ani nie usuwa ich automatycznie. Test lokalny można dodatkowo uruchomić z `GYM_TEST_EXPORT` wskazującym eksport JSON — dane użytkownika nie są dodawane do repozytorium.

## Import kopii z wieloma wpisami jednego dnia

Pełny eksport może zawierać kilka historycznych rekordów dla tej samej daty. Import zachowuje je oddzielnie według ID, zamiast odrzucać plik lub scalać wyniki. Podsumowanie pokazuje liczbę takich dat. Ponowienie importu tego samego pliku nie tworzy kolejnych wpisów. Pojedyncze rekordy nadal aktualizują istniejący trening według daty. Jeśli w docelowym profilu istnieją niepasujące identyfikatory dla dnia z wieloma wpisami, import zatrzymuje się przed zapisem i wskazuje daty. Starsze rekordy bez pola `exercises` są traktowane jako wpisy bez ćwiczeń; wszystkie notatki i pozostałe pola zostają zachowane. Zwykły zapis formularza nadal chroni przed przypadkowym tworzeniem kilku wpisów na datę.

## Poprawki v0.9.1

- **Dodaj profil** otwiera formularz bezpośrednio na stronie. Nie wymaga `prompt`, który może być blokowany w osadzonych przeglądarkach. Test obejmuje otwarcie, anulowanie i utworzenie profilu przy wyłączonym `prompt`.
- **Cofnij zmiany**, obok zapisu, przywraca lokalną wersję ostatniego zapisu wybranego dnia: serie, ciężary, notatki, sprzęt i rodzaj treningu. Nie wykonuje zapisu ani usuwania w Azure. Działa też dla niezapisanych formularzy po odświeżeniu strony. Nie cofa już zatwierdzonego zapisu w Azure. Kopia do cofania jest izolowana razem z całym stanem profilu.
- Usunięto zdjęcie hantli w kartonie i automatyczne przypisywanie jednego zdjęcia wszystkim ćwiczeniom z hantlami. Katalog zawiera 70 zdjęć demonstracyjnych dla 41 par ćwiczenie–wariant. Dwa ujęcia ruchu, polski opis i źródło są dobierane do wybranego wariantu. Fotografie Matrix pozostają w osobnej sekcji identyfikacji maszyny. Inny model na demonstracji jest wyraźnie opisany. Przy braku pasującej demonstracji pozostaje opis ruchu, bez udawania zdjęcia ćwiczenia schematem sprzętu.

# Gym Tracker — v0.9 · Profile użytkowników

Na samej górze ekranu wybierz profil lub użyj **+ Dodaj profil**. Nowy profil zaczyna z pustym dziennikiem i tym samym szablonem ćwiczeń. Nazwy mogą się powtarzać: dane identyfikuje niezależny identyfikator. Profile są dodatkowymi dziennikami w obrębie zalogowanego konta, nie oddzielnymi loginami.

- Treningi, historia, zmiany planu dla konkretnej daty i `planSnapshots` mają osobny zakres Azure dla każdego profilu. Ustawienia Progresu mają osobny rekord `profile-settings-v1` z ochroną ETag. Lista profili synchronizuje się przez `/api/profiles`.
- Offline: oddzielne IndexedDB, klucze localStorage i dzienniki niewysłanych zmian. Aktywny profil jest przypisany do karty, więc dwie karty mogą pracować na różnych profilach. Przełączenie przeładowuje aplikację po zapisie lokalnym; jest wstrzymane podczas operacji chmurowej. Niezatwierdzone edycje historii zachowują dotychczasowe ostrzeżenie.
- Migracja bez przepisywania: dotychczasowy zakres Azure oraz nazwy lokalnej bazy i kluczy należą do **Profilu domyślnego**. Zachowane są ID rekordów, ETag, kolejki offline i stare kopie `snapshot`. Stare aplikacje bez parametru `profile` nadal widzą wyłącznie profil domyślny. Migracja starego snapshotu wykonuje się tylko w tym profilu i pozostaje idempotentna.
- Ręczny zapis i edycja istniejącego rekordu po dacie działają jak wcześniej. Import nadpisuje tylko daty z pliku, wyłącznie w aktywnym profilu, po pokazaniu podsumowania. Eksport JSON/CSV obejmuje bieżące rekordy Azure aktywnego profilu; JSON dodaje `profileId` i zachowuje kompatybilny format v1. Nie przełącza profilu przy imporcie pliku z innego dziennika. Filtry Progresu synchronizują się niezależnie; eksport treningów nie obejmuje filtrów.

Wszystkie 30 ćwiczeń ma co najmniej dwa warianty. Dodano siedem wariantów nóg i CORE z osobnymi seriami i jednostkami. Warianty nie przeliczają automatycznie ciężarów między sprzętami.

Zdjęcia identyfikacyjne maszyn: 17 lokalnych plików, źródła i oznaczenia modeli w `assets/photo-sources.json` oraz podpisach w aplikacji. Preferowane są rzeczywiste zdjęcia/obrazy produktowe Matrix. Zdjęcia sprzętu i modeli poglądowych są opisane; niepotwierdzony model nie jest przedstawiany jako dokładne wyposażenie siłowni. Przy braku zdjęcia wykonania pojawia się opis ruchu. Usunięto niedopasowane zdjęcie hollow hold. Nowy service worker przechowuje zdjęcia i schematy do pracy offline. Źródła zachowują prawa do zdjęć.

Weryfikacja lokalna:

```text
npm ci --prefix api
node --test api/tests/*.test.cjs tests/catalog.test.cjs
npm install --no-save playwright@1.56.1
npx playwright install chromium
node tests/cloud-e2e.mjs
```

Na Windows z zainstalowanym Edge można ustawić `GYM_BROWSER_CHANNEL=msedge`. Testy przeglądarkowe używają lokalnego serwera i symulowanego Azure, obejmując dwa urządzenia, profile, import/eksport i zachowanie planów. Testy API używają symulowanego Table Storage. Nie modyfikują prywatnych treningów w produkcji.

---

# Gym Tracker — v0.7 · Azure Primary · trening wybierany datą

PWA na iPhone i Windows (HTML/CSS/JS, bez etapu kompilacji). Hosting: Azure Static Web Apps. Historia treningów i sesje w Azure Table Storage, z lokalnym buforem do pracy offline. Zakres testów i infrastruktury jest opisany w `docs/AZURE_AUTHORITY_V04.md`.

## Zmiana rodzaju treningu tylko na wybrany dzień

Nad formularzem treningu znajdziesz pole **Rodzaj treningu w wybranym dniu**. Obejmuje wszystkie cztery gotowe treningi siłowe (klatka, plecy, barki/biceps/triceps, nogi), GRIT, dzień wolny oraz **Inny trening** (notatka o innej aktywności). Każda data domyślnie ma swój standardowy dzień planu: poniedziałek klatka, wtorek plecy, środa ramiona/barki, czwartek GRIT, piątek nogi, weekend wolny. Możesz jednak przełączyć tylko konkretną datę, także w weekend.

Zmiana rodzaju treningu nie modyfikuje planu w innych dniach ani innych tygodniach. Wpisane już serie są przechowywane w polu `planSnapshots` danego dnia podczas przełączania szablonów; gdy wrócisz do poprzedniego rodzaju treningu, wartości zostaną przywrócone. Przy zmianie dnia z potwierdzonymi seriami pojawia się potwierdzenie. Przełączenie działa początkowo lokalnie, a przycisk **Zapisz trening / Zapisz zmiany / Zapisz dzień** aktualizuje jedyny istniejący rekord tej daty w Azure. Weekend i GRIT w trybie bez serii mogą mieć notatkę. Oznaczenie dnia wolnego na dniu treningowym również zapisuje się w Azure, dzięki czemu jest widoczne na komputerze i iPhonie. JSON export/import zachowuje te ustawienia.

## Zapisywanie treningów — jeden formularz, jeden rekord na datę

Na telefonie i komputerze przejdź do **Trening**, wybierz datę, uzupełnij wyniki i kliknij **✓ Zapisz trening** albo **✓ Zapisz zmiany**. Aplikacja odczytuje aktualne rekordy w Azure i, jeżeli dla tej daty istnieje trening, zapisuje nowe wartości (serie, ciężary, powtórzenia, RIR, notatki) **do jego obecnego ID**. Nie tworzy drugiego wpisu — nawet jeżeli lokalny trening na urządzeniu ma inny identyfikator. Gdy wybrana data nie istnieje w Azure, tworzy jeden nowy rekord. Każdy zapis jest weryfikowany odczytem Azure. Jeśli sieć jest niedostępna, zmiany pozostają w lokalnej kopii i wymagają ponownego kliknięcia Zapisz po odzyskaniu połączenia. Sama edycja pól bez przycisku Zapisz nie zmienia Azure. Inne daty pozostają nietknięte.

Po zapisaniu na jednym urządzeniu drugie automatycznie pobiera zmiany po otwarciu lub wznowieniu aplikacji. Nie trzeba importować ani scalać dzienników. Gdy dwa wpisy istniały już dla jednej daty, automatyczny zapis wstrzymuje się zamiast usuwać dane bez wiedzy użytkownika.

## Zakładka Dane: import i eksport

- **Import danych** przyjmuje pliki Gym Tracker JSON: pełny eksport `gym-tracker-db-export-v1`, starsze kopie `{sessions,history}` oraz pliki `gym-tracker-history-additive-v1`. Przed zapisem aplikacja wyświetla podsumowanie: ile dat zostanie nadpisanych, ile dodanych, a ile jest identycznych. Istniejący rekord identyfikuje **po dacie**, zachowuje jego identyfikator w Azure i podmienia wartości wyłącznie dla dat uwzględnionych w imporcie. Daty nieobecne w JSON pozostają nietknięte. Zapis jest chroniony wersją rekordu (ETag). Import jest możliwy również przy odrębnym, niezwiązanym z nim komunikacie o rozbieżności synchronizacji. W razie błędu w połowie importu aplikacja podaje, do której daty doszła; ponowny import tego samego pliku jest bezpieczny.
- **Eksport całej bazy** odczytuje bieżące rekordy z Azure z konta GitHub, niezależnie od lokalnego cache. JSON zachowuje strukturę, identyfikatory i wszystkie pola wyników; CSV rozwija wszystkie serie robocze i rozgrzewkowe, notatki i metadane do tabeli (do analizy, nie jako kopia odtwarzalna 1:1). Eksport nie działa bez połączenia — nie przedstawia lokalnego cache jako pełnej bazy.
- **Awaryjny raport tekstowy** oraz manualny przycisk **Odśwież Azure** zostały usunięte z interfejsu. Aplikacja synchronizuje dane po otwarciu, wznowieniu, powrocie sieci i wejściu do zakładki. Wszelkie niezapisane lokalne zmiany są chronione przed nadpisaniem.

## Jak korzystać

1. W zakładce **Trening** wybierz datę w kalendarzu tygodniowym **Pon–Nd**; strzałki przesuwają tydzień, „Dziś” wraca do aktualnej daty, a pole daty umożliwia skok.
2. Jeśli tego dnia istnieje trening, formularz otwiera **istniejący wpis do edycji** i zachowuje jego `syncId`. Jeżeli go nie ma, wyświetla niewykonane serie z proponowanym ciężarem i liczbą powtórzeń.
3. **Edycja już zakończonego treningu:** po zmianie ciężaru, serii lub RIR kliknij **Zapisz zmiany** pod notatkami. Do tego momentu korekty nie trafiają do chmury. Kliknięcie zastępuje dotychczasową zawartość tego samego rekordu `history:*` (nie tworzy drugiej sesji). Przy opuszczeniu formularza z niezapisanymi poprawkami pojawi się ostrzeżenie.
4. Wybieraj alternatywną maszynę, hantle lub wyciąg z widocznych przycisków; każdy wariant ma osobne serie. Przy powtórzeniach działają przyciski **− / +**.
5. Potwierdź serię przyciskiem ✓. Zmiany pozostają w lokalnym buforze do kliknięcia **Zapisz**; **nie trzeba kończyć treningu**. Niewykonane wartości domyślne nie tworzą rekordu w Azure. Korekty już zakończonych treningów są zatwierdzane ręcznie przyciskiem **Zapisz zmiany**.
6. **CORE BONUS** ma 10 opcjonalnych ćwiczeń ze zdjęciami poglądowymi i źródłami. Czwartek (GRIT) oraz sobota/niedziela nie są rejestrowane.
7. W **Progresie** wybierz ćwiczenie, wariant sprzętu, ciężar/powtórzenia/objętość i liczbę ostatnich treningów. Wykres bazuje wyłącznie na wykonanych seriach z zakończonej historii i autosave'owanych sesji.

**Bezpieczeństwo danych:** w Azure istnieje odrębny rekord per `draft:YYYY-MM-DD-day` lub `history:id` (zachowany format v0.4). Nawigacja po datach nie wysyła pustych treningów. Korekta historycznego wpisu aktualizuje ten sam rekord z ochroną ETag. Nie ma automatycznego usuwania istniejących rekordów i nie ma migracji schematu bazy. Lokalny IndexedDB/localStorage to bufor pracy offline, nie druga „główna baza”.

**Zdjęcia:** zdjęcia ćwiczeń CORE są osadzone z zewnętrznych źródeł; jeśli serwis źródłowy blokuje wyświetlenie, może pojawić się komunikat o niedostępności. Zawsze widać tytuł ćwiczenia i źródło obrazu.

## Historia wersji
- v0.8: per-data wybór treningu, GRIT, dzień wolny i inna aktywność bez zmiany planu tygodniowego.
- v0.7: prosty import aktualizujący istniejące daty i pełny eksport Azure JSON/CSV.
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

Testy funkcjonalności, uruchamianie i mapa pokrycia: [tests/README.md](tests/README.md).

## Własne plany

Zakładka **Plany** pozwala tworzyć i duplikować szablony, dodawać ćwiczenia z katalogu i własne, zmieniać kolejność, sprzęt, rozgrzewkę i serie robocze. Zmiany edytora zatwierdza przycisk **Zapisz plan**; można je anulować. Rozkład tygodnia zapisuje się po wyborze planu przy dniu.

Plany są przypisane do profilu i synchronizowane przez istniejący endpoint ustawień z kontrolą ETag. Rozpoczęty trening zawiera niezależną kopię `planDefinition`; zmiana lub usunięcie szablonu nie zmienia zapisanych wyników. Stare treningi bez kopii zachowują dotychczasowe definicje. Eksport treningów JSON zachowuje kopie planów; eksport CSV wykorzystuje historyczne nazwy ćwiczeń. Biblioteka i rozkład tygodnia mają osobny eksport/import w zakładce Plany. Import biblioteki wymaga potwierdzenia zastąpienia i nie zmienia treningów.

Limity: 12 planów, 30 ćwiczeń w planie, do 15 serii każdego rodzaju na ćwiczenie. Biblioteka wraz z ustawieniami ma limit 18 KB, pozostawiający rezerwę względem limitu API 20 KB. Przekroczenie limitu nie zamyka edytora ani nie usuwa jego zmian. Własne ćwiczenia korzystają z istniejących rodzajów sprzętu; nie pobieramy do nich automatycznie niezweryfikowanych zdjęć.

## Historia zapisów, kopie i wyniki

W treningu **Historia zapisów → Pobierz poprzednie wersje** pokazuje wcześniejsze zapisy. Wybrana wersja trafia do formularza; **Zapisz** zatwierdza przywrócenie, **Cofnij zmiany** je odrzuca. Serwer zachowuje do 10 poprzednich wersji (mniej dla bardzo dużych rekordów), razem z aktualizacją tego samego rekordu i kontrolą ETag. Konflikt nie tworzy wersji ani nie nadpisuje innego urządzenia. Przywrócenie zachowuje też wersję zastępowaną. Archiwum powstaje od tej aktualizacji; nie odtwarza dawnych nadpisań. Usunięcie rekordu przez API usuwa również jego archiwum. Standardowy eksport/import nadal przenosi bieżące treningi; archiwum wcześniejszych zapisów pozostaje w Azure.

Nagłówek odróżnia zapis lokalny od stanu Azure i przypomina o niezatwierdzonych zmianach. W Danych można pobrać kopię lokalną bez sieci. Timer zachowuje termin końca przerwy po przeładowaniu tej samej karty, osobno dla profili; powiadomienie nie jest gwarantowane przy zamkniętej aplikacji. Poprzednie wyniki są widoczne przy poszczególnych seriach.

W Progresie są podsumowania 12 ostatnich tygodni z aktywnością i rekordy osobiste. Obliczenia uwzględniają wykonane serie robocze, bez rozgrzewki i niepotwierdzonych propozycji. Warianty sprzętu i jednostki (powtórzenia/czas/kroki) są rozdzielone. Zestawienie objętości pomija ćwiczenia na czas, gumy, masę ciała i nieustalone jednostki; dla maszyn liczonych na stronę uwzględnia obie strony. Podłączenie modelu rekomendacji jest odłożone zgodnie z decyzją użytkownika.
