"""Reviewed exercise+variant mappings; never use a generic dumbbell photo."""
import concurrent.futures,json,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'exercise-source.tmp.json'
raw=source.read_text(encoding='utf-8') if source.exists() else urllib.request.urlopen('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json',timeout=30).read().decode('utf-8')
data={x['id']:x for x in json.loads(raw)}
guides={}
def add(item,machines,exercise,label,tip):
    entry=data[exercise]
    for machine in machines.split(','):
        guides[item+'|'+machine]={'exerciseId':exercise,'title':label,'tip':tip,'source':'https://github.com/yuhonas/free-exercise-db/blob/main/exercises/'+exercise+'.json','credit':'Free Exercise DB / public domain','images':['assets/guides/'+p for p in entry['images'][:2]]}
add('flat','DUMBBELL','Dumbbell_Bench_Press','Wyciskanie hantli na płasko','Oprzyj stopy, ustabilizuj łopatki. Opuść hantle po bokach klatki i wyciśnij bez odbijania.')
add('incline','DUMBBELL','Incline_Dumbbell_Press','Wyciskanie hantli na skosie','Oprzyj plecy o skośną ławkę. Prowadź hantle nad klatkę, bez unoszenia barków do uszu.')
add('fly','DUMBBELL','Dumbbell_Flyes','Rozpiętki z hantlami','Lekko ugnij łokcie i utrzymuj ten kąt. Rozłóż ramiona do komfortowego zakresu, następnie zbliż hantle nad klatką.')
add('pullover','PULLOVER','Bent-Arm_Dumbbell_Pullover','Przenoszenie hantla za głowę','Trzymaj jeden hantel oburącz. Przy stabilnym tułowiu przenieś go za głowę i wróć nad klatkę.')
add('laterals','DUMBBELL','Side_Lateral_Raise','Unoszenie hantli bokiem','Unieś ramiona bokiem do wysokości barków i powoli opuść. Nie podrzucaj ciężaru tułowiem.')
add('shoulder','DUMBBELL','Dumbbell_Shoulder_Press','Wyciskanie hantli nad głowę','Ustabilizuj tułów. Wyciśnij hantle z wysokości barków i opuść je pod kontrolą.')
add('preacher','DUMBBELL','One_Arm_Dumbbell_Preacher_Curl','Uginanie hantla na modlitewniku','Oprzyj ramię o poduszkę. Uginaj łokieć bez odrywania ramienia; powoli wróć.')
add('preacher','CABLE','Cable_Preacher_Curl','Uginanie na modlitewniku z wyciągiem','Oprzyj ramiona o poduszkę, uginaj łokcie bez unoszenia barków i kontroluj opuszczanie.')
add('hammer','HAMMER','Hammer_Curls','Uginanie młotkowe z hantlami','Utrzymuj dłonie zwrócone do siebie. Uginaj łokcie przy nieruchomych ramionach.')
add('hammer','CABLE','Cable_Hammer_Curls_-_Rope_Attachment','Uginanie młotkowe z liną','Chwyć linę neutralnie. Zbliż dłonie do barków, nie przesuwając łokci do przodu.')
add('rear','DUMBBELL','Seated_Bent-Over_Rear_Delt_Raise','Odwrotne rozpiętki w opadzie','Pochyl tułów i ustabilizuj plecy. Unieś ramiona na boki bez zamachu, potem powoli opuść.')
add('row','CABLE','Seated_Cable_Rows','Wiosłowanie na wyciągu siedząc','Utrzymaj tułów stabilny. Przyciągnij uchwyt do brzucha, prowadząc łokcie w tył; kontroluj powrót.')
add('lat','CABLE','Wide-Grip_Lat_Pulldown','Ściąganie drążka do klatki','Oprzyj uda pod wałkami. Ściągnij drążek przed siebie do górnej klatki, bez kołysania tułowiem.')
add('straight','CABLE,STRAIGHT-ARM','Straight-Arm_Pulldown','Ściąganie na prostych ramionach','Przy lekko ugiętych łokciach prowadź uchwyt do ud. Nie zmieniaj kąta łokci w trakcie ruchu.')
add('pullover','CABLE','Straight-Arm_Pulldown','Zamiennik: ściąganie na prostych ramionach','To zamiennik na wyciągu. Prowadź uchwyt do ud bez uginania i prostowania łokci.')
add('triceps-rope','TRICEPS-ROPE,CABLE','Triceps_Pushdown_-_Rope_Attachment','Prostowanie ramion z liną','Trzymaj łokcie przy tułowiu. Wyprostuj ramiona, rozsuń końce liny i kontroluj powrót.')
add('triceps-preacher','CABLE','Triceps_Pushdown','Zamiennik: prostowanie ramion na wyciągu','Łokcie pozostają przy tułowiu. Prostuj przedramiona w dół bez pochylania się nad uchwytem.')
add('back-extension','ROMAN','Hyperextensions_Back_Extensions','Prostowanie tułowia na ławce','Oprzyj biodra o poduszkę. Opuść tułów i wróć do linii nóg, bez odchylania się za tę linię.')
add('back-extension','BODY','Hyperextensions_With_No_Hyperextension_Bench','Zamiennik: prostowanie tułowia na podłodze','Leżąc na brzuchu unieś górę tułowia w małym, kontrolowanym zakresie, następnie opuść.')
add('calf','DB-CALF','Dumbbell_Seated_One-Leg_Calf_Raise','Wspięcia siedząc z hantlem — jedna noga','Oprzyj hantel na udzie, przytrzymując go dłonią. Unieś piętę, zatrzymaj i powoli opuść; zmień stronę.')
add('core-crunch','CABLE','Cable_Crunch','Spięcia brzucha na wyciągu','W klęku zbliż żebra do miednicy. Uchwyt utrzymuj przy głowie, nie ciągnij samymi ramionami.')
add('core-crunch','PLATE','Weighted_Crunches','Spięcia brzucha z talerzem','Leżąc trzymaj talerz przy klatce. Unieś łopatki przez spięcie brzucha i kontroluj opuszczanie.')
add('core-knees','BODY','Knee_Hip_Raise_On_Parallel_Bars','Unoszenie kolan na poręczach','Oprzyj przedramiona na poręczach. Unieś kolana, podwijając miednicę; unikaj kołysania.')
add('core-knees','LYING-KNEES','Bent-Knee_Hip_Raise','Unoszenie kolan leżąc','Leżąc z ugiętymi nogami przyciągnij kolana i lekko podwiń miednicę. Opuść nogi pod kontrolą.')
add('core-woodchop','CABLE','Standing_Cable_Wood_Chop','Woodchop na wyciągu','Prowadź uchwyt po skosie z góry w dół. Obracaj się płynnie razem z biodrami, bez szarpania.')
add('core-wheel','AB-WHEEL','Ab_Roller','Rollout z kółkiem z kolan','Napnij brzuch. Odsuwaj kółko tylko tak daleko, jak utrzymujesz pozycję tułowia, następnie wróć.')
add('core-bend','DUMBBELL','Dumbbell_Side_Bend','Skłony boczne z hantlem','Trzymaj jeden hantel. Wykonaj mały skłon boczny i wróć do pionu, bez skręcania tułowia.')
add('core-bend','CABLE','One-Arm_High-Pulley_Cable_Side_Bends','Skłony boczne na wyciągu','Demonstracja z górnym wyciągiem. Ustawienie uchwytu różni się od dolnego wyciągu; nie skręcaj tułowia.')
# These demonstrate the movement on another manufacturer's machine. Model
# identification remains a separate, explicitly labelled Matrix photo.
add('fly','G3-S12,G7-S22','Butterfly','Rozpiętki na maszynie — przykład ruchu','Ustaw siedzisko tak, aby uchwyty były na wysokości klatki. Zbliż ramiona bez odrywania pleców od oparcia.')
add('rear','G3-S22,G7-S22','Reverse_Machine_Flyes','Odwrotne rozpiętki na maszynie — przykład ruchu','Usiądź przodem do oparcia. Rozprowadź ramiona na boki bez unoszenia barków i kontroluj powrót.')
add('shoulder','MG-PL23','Leverage_Shoulder_Press','Wyciskanie na maszynie dźwigniowej — przykład ruchu','Ustaw siedzisko, oprzyj plecy i wyciśnij uchwyty nad głowę bez wypychania tułowia.')
add('preacher','MG-PL41','Machine_Preacher_Curls','Uginanie na maszynie — przykład ruchu','Oprzyj ramiona o poduszkę. Uginaj łokcie, utrzymując barki i ramiona nieruchomo.')
add('row','MG-PL34,DIVERGING-ROW','Leverage_Iso_Row','Wiosłowanie na maszynie — przykład ruchu','Oprzyj klatkę o poduszkę. Przyciągnij uchwyty przez prowadzenie łokci w tył, następnie powoli wróć.')
add('legcurl','LEG-CURL','Seated_Leg_Curl','Uginanie nóg siedząc — przykład ruchu','Ustaw oś maszyny przy kolanie i wałek nad piętą. Ugnij kolana, nie odrywając bioder od siedziska.')
add('extension','G7-S71','Leg_Extensions','Prostowanie nóg na maszynie — przykład ruchu','Ustaw oś maszyny przy kolanie, wałek nad kostką. Wyprostuj kolana pod kontrolą, bez kopnięcia.')
add('calf','MG-PL77','Seated_Calf_Raise','Wspięcia siedząc na maszynie — przykład ruchu','Ustaw przodostopie na podparciu, uda pod poduszką. Unieś pięty i opuść je powoli przez komfortowy zakres.')
for key,guide in guides.items():
 if key.split('|')[1] in ['G3-S12','G7-S22','G3-S22','MG-PL23','MG-PL41','MG-PL34','DIVERGING-ROW','LEG-CURL','G7-S71','MG-PL77']:
  guide['note']='Demonstracja ruchu na maszynie poglądowej, nie na konkretnym modelu Matrix. Zdjęcie właściwego modelu jest w sekcji „Rozpoznaj maszynę”.'
paths=sorted({p for g in guides.values() for p in g['images']})
def fetch(path):
    target=root/path;target.parent.mkdir(parents=True,exist_ok=True)
    raw=urllib.request.urlopen('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'+path.removeprefix('assets/guides/'),timeout=25).read()
    if not raw.startswith(b'\xff\xd8'):raise ValueError(path)
    target.write_bytes(raw)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(fetch,paths))
(root/'assets/exercise-guides.json').write_text(json.dumps(guides,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'exercise-guides.js').write_text("'use strict';\nwindow.GymExerciseGuides="+json.dumps(guides,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print('Downloaded',len(paths),'photos for',len(guides),'exercise variants')
