# Tajná část – poznámky k implementaci

Jen pro vývoj. Uživatel tenhle soubor nečte (viz `zadani/00_CTI_NEJDRIV.md`, oddíl 5).

## Soubory

- `texts.js` – texty tajné části (jména Posla a Srdce mlhy, druhé řádky kodexu, epilog, titulky, Hugovy hlášky). `data/texts.cs.js` je přimíchá do `T`.
- `journal.js` – stránky deníku 1–10 (stránka 10 = dopis z vlny 99, má i potrhanou verzi).
- `sim.js` – herní logika tajných okamžiků (háčky volané ze simulace), předměty na mapě (`s.items`), Temný Knot (`s.dark`).
- `finale.js` – vlna 100 (`s.fin`): fáze 1–4, signál.
- `index.js` – spouštěče pro ladicí režim (`?debug=1`, pole „kód“ + Událost).

Vykreslení je v `render/late.js` (`lateSecret`, `drawLateCharacters`, `finaleLight`), rozhraní v `main.js` (`secretUi`, `gameWon`) a `ui/screens.js` (`showEpilogue`, `showCredits`).

## Hotovo (Etapa 4)

| Kód | Stav | Poznámka |
|---|---|---|
| P-46 | hotovo | Po smrti Královny (vlny ≤ 100) všichni rojíci a vejce zmizí a vyletí jako motýli. ★ 4 s. Rojíci nedávají zlato. |
| P-51 | zčásti | Po dohrání je úvodní obrazovka ve svítání (nálada 11) s Hugem, Knotem a kočkou na lavičce. Úvodní obrazovka podle kapitol zbývá na Etapu 5. |
| P-57 | hotovo | Po dohrání sedí Hugo na lavičce u majáku; ťuknutí = hláška (8 hlášek dokola). V nekonečném režimu každých 25 s hodí klíč po nejsilnějším viditelném nepříteli (300 × H(w), typ „knot“). |
| P-58 | hotovo | Druhé řádky kodexu po dohrání (`meta.finished`), upozornění „V kodexu přibylo pár řádků.“ po titulcích. |
| P-59 | hotovo (Etapa 3) | |
| P-60 | hotovo | První Hlubinný červ (vlna 80, ne vracející se) se poprvé vynoří u rybníka (pole 8,14 nebo okolí), při druhém vynoření spolkne Knota na 8 s. Kulatý výřez vpravo nahoře, každé ťuknutí (kamkoli) = 0,7 % životů červa, nejvýš 40 ťuknutí. Červ zůstane nahoře, dokud Knota nevyplivne. ★ 8 s. Jen jednou za hru (`s.sec.swallowed`). |
| P-61 | hotovo | Mistr (vlna 90, ne vracející se) pod 50 % vytvoří Temného Knota (stejné životy a poškození jako Knot, jde přímo za Knotem, bojuje jen s ním). Knot na něj útočí sám (má přednost před nepřáteli). Po porážce, nebo nejpozději po 30 s, zůstane čip = stránka 9. Když čip nikdo nevzal a Temný Knot nevznikl, stránka 9 přijde po vlně 90 sama. |
| P-62 | hotovo | Vrak Obléhací věže (vlna 70) leží do konce příští vlny jako předmět (neblokuje). Ťuknutí = stránka 7. Když ho hráč neprohledá, stránka 7 přijde po vlně 71 sama; když věž došla k majáku, přijde hned po vlně 70. |
| P-63 | hotovo | Vlna 99: prázdný náhled, tip „Ticho.“, Posel (sliz s čepicí a dopisem, 0,42 pole/s, světlo 0). Tlačítko „Zadržet palbu“ (věže, pasti i Knot ho pak nechají být). Došel → bez ztráty světla, stránka 10 a relikvie Dopis (aura +1, +10 % rychlosti), odejde zpět ke vstupu. Zabit → dopis na zemi, Knot si pro něj dojde (nebo ťuknutí), potrhaná stránka 10, hláška. |

## Finále (oddíl 5)

- Před vlnou 100 vznikne záchytný bod „po vlně 99“.
- Fáze 1: Srdce (6000 × H(100), boss) jde ze severu 0,3 pole/s, každých 12 s přivolá ze S, V, Z skupinu z kapitol 1–3 (55 % životů). Když dojde k majáku vcelku, ubere 30 světla a rozpadne se.
- Fáze 2 (pod 66 %): tři úlomky (S, V, Z), každý třetina zbytku, každý volá ze svého vstupu kapitoly 4–8. Úlomek u majáku bere 25 světla.
- Fáze 3: zbylí nepřátelé ztuhnou a otočí se k severu, věže nestřílí, kouzla nejdou, maják zhasne, světlo nemůže ubývat, hudba utichne. Srdce (nesmrtelné) jde 0,36 pole/s, mlha z něj opadává (`fin.prog`), zbude silueta. Hlášky: „…Hugo?“ po 4 s, nápovědy po dalších 15/30 s, tři čárky a tečka nad majákem po 45 s.
- Signál: stisky na obraz majáku; dlouhý ≥ 0,42 s, jinak krátký; posledních 8 se pamatuje, rozhoduje posloupnost L L L S. Když Srdce dojde k majáku, dá signál Knot (`fin.byKnot`).
- Fáze 4: zlatý paprsek oběhne 1,5× ostrov, nepřátelé se rozplynou ve světla, světlušky, Hugo jde k prahu (1,5 pole/s, nejdéle 16 s), Knot mu jde naproti. Pak vlna skončí → `gameWon` → epilog (nálada svítání) → titulky → úvodní obrazovka.
- Hra nejde prohrát ve fázi 3–4. Ve fázi 1–2 ano (návrat na bod před vlnou 100).

## Návraty bossů v kapitole 10

Mají 60 % životů (`RETURN_HP`), jsou zesvětlené do modrošeda a kouří z nich mlha. Při smrti se nerozpadnou, ale rozzáří a rozplynou ve světla.

## Etapa 5: zbytek tajné části

Soubory: `world.js` (logika; stav v `s.sec`, vlastní náhoda `s.sec.rng`, aby překvapení neposouvala karty), `view.js` (rekvizity a efekty, přimíchané do View jako `sx*`), `ui.js` (třída `SecretUi` = `app.sx`: ťukání, sbírky, obrazovky, hodiny zařízení, ladicí spouštěče), `texts2.js` (texty: `T.sx`, vzkazy, názvy podivností, úspěchy).

Trvalé sbírky jsou v `meta` (mimo průchod): `odd` (podivnosti), `bottles`, `hats`, `ach`, `stat`, `loss`/`aid` (P-56), `knotHat`, `s16`, `creditGold`, `sock`, `plane`, `flagKilled`. Záloha je obsahuje.

„Nebe“: kamera se dívá shora, obloha ve hře není vidět. Věci „na obloze“ (měsíc, lampiony, polární záře, duha) proto visí na „polici“ za severním okrajem odkryté části ostrova (na šířku za západním), viz `sxShelf`. Letadlo, hvězda a velryba letí přímo nad ostrovem.

| Kód | Jak je to udělané |
|---|---|
| 2.3 | Lahev připluje po vlně 3 a pak každých 4–6 vln (`s.sec.bottleAt`), čeká u břehu vlevo od majáku (i tlačítko vlevo nahoře). Který vzkaz, určí až otevření (`nextBottle`): pořadí `BOTTLE_ORDER`, 3→4→5→6 po sobě, 9 jen offline (a první, když hra startovala offline = P-53), 13 letadlem (lahví až po vlně 70), 14 po 60, 16 jen 22–5 h, 19 po 40, 20 po dohrání. 33 vzkazů (13 vlastních; č. 33 je nápověda k P-17, č. 26 k P-16). |
| P-01 | `s.sec.wander` po některých vlnách (40 %, poprvé jistě po vlně 2). Sliz chodí po břehu vlevo; 10 ťuknutí → mazlíček do konce kapitoly. |
| P-02 | 10 ťuknutí na maják do 3,5 s. 10 s, jednou za vlnu. |
| P-03 | 2 min bez dotyku ve fázi stavění. |
| P-04 | Šance při zabití (1/180; dokud nekradl a je po vlně 12, 1/25). Dárek 25 × počet po 12 vlnách od první krádeže. |
| P-05 | 1/400 při zrodu (bez klobouku po 500 nepřátelích 1/60). +5 zlata při zabití, klobouk do `meta.hats`. |
| P-06 | První dron od vlny 13. Text je i v panelu nepřítele (v malém měřítku nejde přečíst). |
| P-07 | Slizi, 3 % (první 12 %), nejvýš 2 za vlnu. Text i v panelu. |
| P-08 | Jméno při úrovni 3 (`b.nm`), počítadlo `b.k`. Rozloučení při prodeji. |
| P-09 | 300 s na 8× a víc bez přepnutí na nižší. |
| P-10 | 8 ťuknutí na 8× do 3 s. Pak 8× přepíná 8×/16×. |
| P-11 | 777 (+77), 404, 1234 na začátku vlny. |
| P-12 | Řádek navíc v souhrnu kapitoly. |
| P-13 | Měsíc na polici v kapitolách 6, 8, 10. Třetí ťuknutí = sýr a myš (do konce sezení). |
| P-14 | Ťuknutí na rybník Louky; každé páté odnese rybu racek. |
| P-15 | Tón podle polohy věže (pentatonika). Bez zvuku aspoň nota nad věží. |
| P-16 | Počítá se při každé změně staveb (`sxGardens`). Včely 3 × H(w) za sekundu do 2 polí. Skála se jako zeď nepočítá. |
| P-17 | Po vlně 60. Důl + Mrazicí (v libovolném pořadí, nejvýš 2 kusy; drobní nepřátelé a bossové neplatí ani nestojí). Past přetažená na Banku = Trezor: počítá se jako banka a s ním nikdo neukradne nic ani z dolů. Stavby se registrují do `BUILDINGS` z `world.js`. |
| P-18 | Po vlnách 17, 34, 52, 68, 86; tři ze čtyř obchodů; odplouvá se začátkem další vlny. Krabice 50 + 3·vlna: 30 % dvojnásob, 20 % karta, 16 % +15 světla, 16 % věž zdarma, 18 % ponožka. Pytel 30: klobouk / vzkaz / 90 zlata / 1 zlato. Výměna jen základní čtyři věže. |
| P-19 | Od vlny 15, 30 % (čtvrtá nabídka jistě). `mys1`–`mys6`, texty v `texts2.js`. |
| P-20 | 37. zlatý rojík vlny 55. Věže ho nezraní (`e.truce`), Knot a kouzla ano. |
| P-21 | První plecháč od vlny 37. `s.sec.mech` → po každé vlně jedna oprava zdarma. Zabitý: řádek v kodexu u Plecháče. |
| P-22 | První Válec. Zeď s `skin: 'valec'`, `paid: 80`, na nejbližším poli, kde smí stát zeď. |
| P-23 | Vejce po vlně 30 (nebo první pozdější), Pepa o 5 vln později; spolkne jednoho běžného nepřítele do 1,7 pole od majáku za vlnu. |
| P-24 | Kočka je „chodec“ (`s.sec.walk`), ne nepřítel. Vlna 23, pro starší pozice každá vlna končící trojkou. Pak jeden šmejdil do 3,2 pole od majáku za vlnu. Jméno v bublině až po přečtení stránky 3. |
| P-25 | Po vlně 58 (do 89). Tráva nejdál od cest, ne v Mlžné bráně. `mapMods[i] = 'R'`. |
| P-26, P-28 | Knot stojí 3 s. Krabice 40 + 10·kapitola; pátá dá relikvii `hugoCap`. Truhla 200. |
| P-27 | Dlouhý stisk na obrázek majáku (už neposílá Knota za maják). 5 s, dobíjení 60 s. |
| P-29 | 9 % po vlně (poprvé 50 % od vlny 14). |
| P-30 | Místo obrazovky prohry; návrat na start. Hrnec pro Knota. |
| P-31 | 20 ťuknutí na rybník, jednou za hru. |
| P-32 | Knot do 1,8 pole od praskliny, před vlnami 44–46. |
| P-33 | 666: `w.hell`, +6 % rychlost a zlato, rudá obloha. |
| P-34 | 30 s pauzy v boji. |
| P-35 | Vlna 66, po 12 s. Rozhraní zastaví simulaci na 3,5 s, tma přesně 2 s. |
| P-36 | Od 80 % světla dolů, pod 20 bodů všech 230 párů. |
| P-37 | Od kapitoly 5 slabý odraz v rybníku, postava na 8 s každých 70–160 s. |
| P-38 | Jednou za hru, noční kapitola, 7 s ve fázi stavění. |
| P-39 | Devátý učeň vlny 82 v půli cesty. |
| P-40 | Vlna 87 po 10 s, 1,8 s. Popisky tří horních tlačítek. |
| P-41 | Nabídka má dole řádek „hra · uložená pozice“. Ve vlně 94 na 3,8 s jinak. |
| P-42 | `audio.thin` 1–3 podle vlny (92–100). |
| P-43 | 0–4 h. |
| P-44 | 5 % za vlnu od vlny 12, od vlny 45 jistě (dokud nepřišla), pak 2,5 %. Vyletí zpod okraje, přeletí severní část, 14 s. Ťuknutí = +10 % do konce vlny. Zadání říká „pod ostrovem“; tam by nebyla vidět. |
| P-45 | Záře po vlně 50 (a některé noci kapitoly 6), duha po 70, hvězda každé 3–6 min v nočních kapitolách (střídá zlato a kartu navíc). |
| P-47 | Jednou za 15–30 min, od vlny 30 brzy, pokud ještě nebylo. |
| P-48 | `dayKind()`. 1. 4.: jména čtyř základních věží posunutá o jednu, první vlna dne. |
| P-49 | Počet = dokončené kapitoly (max 9). I na úvodní obrazovce. |
| P-50 | `b.w0` = vlna poslední změny stavby. |
| P-51 | Nálada kapitoly už byla; přibyly lampiony. |
| P-52 | 7 ťuknutí na verzi v Nastavení. Klobouky jdou Knotovi nasadit. |
| P-54 | `SecretUi.showCredits`. Zlato (nejvýš 600) do nekonečného režimu. |
| P-55 | 32 úspěchů, 17 skrytých. |
| P-56 | Prohry se počítají v `meta.loss[kapitola]`; nabídka po návratu na bod při 3. a 5. prohře. Přijatý balíček se po dalším návratu obnoví sám. |
| P-64 | 5 ťuknutí na Knota. |
| P-65 | 42 zlata na začátku vlny. |
| P-66 | Čtyři různé základní věže ve čtverci 2 × 2: +8 % rychlost střelby. |
| P-67 | Tři předčasně přivolané vlny po sobě: +10 % odměny do konce kapitoly. |
| P-68 | Knot stojí 4 s na poli (10, 19) u pramene za dne. |
| P-69 | Krystaly cinkají; čtyři různé do 12 s odpoví společně. |
| P-70 | Tečky cesty běží 3 s pozpátku. Jednou, od kapitoly 5. |
| P-71 | Mokré stopy od severního vstupu k majáku. Jednou za kapitolu 7–10. |
| P-72 | Každé třetí ťuknutí na vysílač. |
| P-73 | Každých 100 poražených pojmenovanou věží: +2 % poškození, nejvýš 5×. |
| P-74 | Páté otevření příručky v jednom sezení. |
| P-76 | 7 ťuknutí do mlhy nad zavřeným sektorem. |

Oddíl 7 (Podivnosti): `meta.odd`, názvy v `ODD`. Celkem 77 (P-45 jsou tři, P-55 se nepočítá). Automaticky jich hráč při dohrání potká přes polovinu.

## Ladicí režim a galerie (pro vývoj)

- Nové kódy pro pole „kód“ (viz `SecretUi.debug`): P-01 až P-09, P-11 (P-11b, P-11c), P-13, P-18, P-19, P-21 až P-25 (P-23b, P-24b), P-29 až P-31, P-33 až P-36, P-38, P-40, P-43 až P-45, P-47 až P-50, P-52, P-54, P-56, P-70, P-71, BOTTLE. Datum a hodina: `?debug=1&datum=12-24&hodina=2`.
- Snímky se skrytým panelem náhledu: `requestAnimationFrame` neběží, snímky je třeba krokovat ručně (`app.frame(čas)`) a číst `canvas.toDataURL` hned po vykreslení.
- `?debug=1`: skok na vlnu 1–100, tlačítko „Konec hry“ (rovnou epilog), pole „kód“ + Událost: P-46, P-57, P-59, P-60, P-61, P-62, P-63, FIN (skok před vlnu 100), FIN3 (rovnou tichá fáze finále).
- `?debug=1&scena=galerie&dil=2`: nepřátelé a bossové kapitol 6–9, hybridy (úroveň 2 a 4), banka.
- Snímky plátna: `node tools/serve.mjs 8094 SLOŽKA`, ve stránce `fetch('/__snap?n=jmeno', { method: 'POST', body: canvas.toDataURL('image/jpeg') })`.
- Poslední vlna: nepřátelé přivolaní Srdcem mají 55 % životů a nechodí z děr (bez toho bot ztrácel kolem 100 světla).

### Opravy z ladění vyvážení (Etapa 5)
- `spawnEnemy` nastavuje `e.messenger` podle dat nepřítele. Všechny kontroly „nestřílet“ čtou `e.messenger`, ale nic ho dřív nenastavovalo, takže věže ve vlně 99 střílely na posla i při zadržené palbě.
- `teleportTick` posla přeskakuje (jinak ho teleport vracel donekonečna a vlna 99 neskončila).
- `damage()` při zadržené palbě poslovi neublíží vůbec (dřív ho zraňoval ostnatý drát, paprsek s kartou a hořící zem).
- Bot (`tools/bot.mjs`) umí tajné okamžiky odehrát: ťuká, když je Knot spolknutý, ve vlně 99 drží palbu a ve finále dá signál 25 s po začátku tiché fáze.
