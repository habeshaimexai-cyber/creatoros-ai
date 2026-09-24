# InvestPro – vollständiger Quellcode für Claude

Stand: 24. September 2026. Der Export enthält die Anwendung einschließlich Oberfläche, Worker-Backend, Rechenmodul, eingebundenem Chart.js, Tests und Build-Skripten. Es ist keine reine HTML-Demo. Die Online-App läuft weiterhin unter https://investpro-live.keleab.chatgpt.site.

## Einstieg für die Prüfung

1. `frontend.html`: lesbare vollständige Oberfläche mit CSS und Browser-JavaScript.
2. `worker/index.js`: produktiver Worker. Die erste Zeile enthält dieselbe Oberfläche als JSON-String; darunter stehen API-Routen und Datenanbieter.
3. `worker/portfolio-math.js`: deterministische Portfolio-, Risiko- und historische Modellrechnung.
4. `tests/portfolio.mjs` und `tests/regression.mjs`: Berechnungs-, API-, Zustands- und Fehlerfallprüfungen.
5. `worker/chart-library.js`: eingebundenes Chart.js 4.4.1 einschließlich Lizenzhinweis.
6. `scripts/`: Build, Artefaktprüfung, Synchronisierung und optionaler lokaler Prüfserver.

## Bearbeiten und prüfen

Node.js 20 oder neuer und für den Build Bash verwenden. Keine npm-Abhängigkeiten zu installieren.

```sh
# Nach Änderungen an frontend.html:
npm run ui:sync
# Prüft auch, ob lesbare und eingebettete Oberfläche identisch sind:
npm test
npm run build
npm run validate
# Optional, nur für den Entwickler / Claude:
npm run dev
```

Der Prüfserver bindet an http://localhost:3000. API-Aufrufe benötigen Internetzugang. Die Oberfläche nicht als file:// öffnen, weil die API- und Asset-Pfade über einen Server laufen. Nach Änderungen den Prüfserver neu starten. Der Eigentümer muss nichts lokal installieren; seine App ist bereits online.

Änderungen der Oberfläche bevorzugt in `frontend.html` vornehmen und anschließend `npm run ui:sync` ausführen. Backend-Code direkt in `worker/index.js` bearbeiten. Nicht die erste Zeile separat ändern und anschließend unbesehen synchronisieren: `ui:sync` ersetzt ausschließlich diese Zeile durch `frontend.html`. Der Build bricht bei Abweichungen ab.

`npm run build` erzeugt `dist/server/index.js`, einen selbstständigen Worker mit `default.fetch`. `.openai/hosting.json` gehört zum vorhandenen Sites-Projekt. Die private Freigabe und Projektkennung beibehalten. Für eine andere Worker-Hostingplattform ist deren Deployment-Konfiguration separat erforderlich. Dieses ZIP enthält keine Anmeldeinformationen und führt selbst kein Deployment durch.

## Korrekturen dieser Revision

- Der automatische Tagesstand wird nur einmal angelegt. Neuberechnungen, Kursänderungen, geänderte Mengen und Wechselkurse überschreiben ihn nicht mehr.
- Ein bewusstes Ersetzen ist über den Button möglich; vor dem Ersetzen eines vorhandenen heutigen Stands wird nachgefragt. Speicherfehler verändern den In-Memory-Stand nicht.
- Neue Stände enthalten CHF-Wert, Speicherzeit, Mengen, Einzelkurse, Quelle, Kurszeit und Umrechnungsraten samt verfügbarer Herkunft. Vorhandene alte Stände bleiben erhalten und werden als nicht vollständig belegbar gekennzeichnet.
- Performance zeigt Messpunkte auf einer echten Datumsskala, CHF-Achsen, Einzelwert-Tooltip und Herkunftstabelle. Es gibt keine geglättete Kurve und keine aus Depotwertänderungen erfundene Anlagerendite. Auch ein einzelner Stand wird sinnvoll angezeigt.
- Historische CHF-Werte werden bei einem Wechsel der Anzeigewährung nicht rückwirkend mit heutigen Wechselkursen umgerechnet.
- Prognose zeigt die letzten fünf tatsächlich aus Kursreihen berechneten Modellfenster mit Start, Ende und Prozentänderung. Aus historischen Quantilen werden keine zukünftigen CHF-Depotziele mehr erzeugt. Die Rechenengine behält Quantile intern zur Kompatibilität; sie sind keine Wahrscheinlichkeitsprognose.
- Der Dashboard-KPI zeigt die historische Datenbasis statt eines vermeintlichen zukünftigen Depotwerts.
- Der Stresstest startet leer. Erst eine eigene Eingabe berechnet ein ausdrücklich hypothetisches Ergebnis.

## Rechenmodell und Grenzen

Die historischen Modellfenster verwenden **heutige Gewichte**, hypothetisches tägliches Rebalancing und datengleiche historische CHF-Wechselkurse. Sie rekonstruieren nicht den tatsächlichen früheren Besitz des Nutzers. Gebühren, Steuern und Zahlungsflüsse fehlen im Modell. Fenster überlappen und sind keine unabhängigen Stichproben. Künftige Kurse oder 99,9 % Genauigkeit werden nicht garantiert.

Die Performance-Seite enthält nur gespeicherte Bewertungen, keine zeit- oder geldgewichtete Rendite. Ein automatischer Stand kann gespeicherte oder manuelle Preise enthalten; die Quelle und vorhandene Kurszeiten sind deshalb wichtig. Neue Tage entstehen nur bei geöffneter App mit vorhandenen Positionen. Es werden keine fehlenden Tage erfunden. Datumsschlüssel basieren auf UTC, angezeigte Uhrzeiten auf dem Browsergebietsschema.

Marktdaten: primär Yahoo Finance. Zwei Yahoo-Hosts sind keine unabhängigen Anbieter. BTC/ETH können zusätzlich Kraken nutzen. Finnhub ist nur implementiert und erfordert einen serverseitigen `FINNHUB_API_KEY`; ein solcher Schlüssel ist nicht im Export enthalten. Anbieter können verzögert, unvollständig, gesperrt oder nicht erreichbar sein.

Das einzelne Aktientrendsignal und technische Scores sind regelbasierte Heuristiken. Sie sind keine KI-Auswertung, keine kalibrierte Wahrscheinlichkeit und keine Preisvorhersage. Es gibt kein LLM-Backend. Diese Bereiche bei einer weiteren Prüfung ausdrücklich mitprüfen.

Portfolio, Positionen und Profil liegen unter `investpro-data` in localStorage. Der Server kennt keine Broker-Zugangsdaten und speichert kein persönliches Depot. Deshalb enthält der Quellcode auch nicht die Positionen des Nutzers. Ein persönliches Backup ist eine separate Exportfunktion in der App und nicht erforderlich, um den Code zu prüfen. Vorhandene Backup-Kompatibilität erhalten.

## Empfohlener Prüfauftrag an Claude

Bitte prüfe die vollständige Anwendung, besonders Performance, historische Modellrechnung, Währungsumrechnung, fehlende/veraltete Marktdaten, gespeicherte Zustände und Eingabevalidierung. Melde konkrete reproduzierbare Fehler und korrigiere sie mit nachvollziehbaren Tests. Erfinde keine Kursdaten oder Prognosewahrscheinlichkeiten. Erhalte echte Nutzereingaben, Backup-Kompatibilität und die bestehende private Freigabe. Nutze README-CLAUDE.md als Architekturübersicht und nicht als Beweis, dass der Code fehlerfrei ist.

## Verifikation

Deterministische Tests bestehen einschließlich Nichtüberschreiben von Tagesständen, bewusstem Ersetzen, Speicherausfall, CHF-Konstanz, Datumsskala, datierten reproduzierbaren Modellfenstern und leerem Stresstest. Build und Worker-Artefakt werden vor Veröffentlichung geprüft. Kein vollständiger visueller Browsertest: Die betreute Vorschau ist für die vorhandene Worker-only-Struktur nicht verfügbar. Anbieter wurden in diesen Tests simuliert; ein bestandener Test beweist keine aktuelle Verfügbarkeit aller Live-Quellen.

