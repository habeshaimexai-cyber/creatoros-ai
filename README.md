# CreatorOS AI

CreatorOS AI ist ein deutschsprachiges Content-Studio für Creator. Die App erstellt plattformspezifische Hooks, Skripte, Captions und Hashtags und verbindet YouTube, Facebook, Instagram und TikTok per OAuth.

## Lokal starten

```bash
cp .env.example .env
npm install
npm start
```

Danach ist die App unter `http://localhost:3001` erreichbar. Für Anmeldung, KI und Social-Verbindungen müssen die entsprechenden Variablen in `.env` gesetzt werden. Der Health-Endpunkt `GET /health` zeigt, welche Integrationen bereit sind.

## Bereitstellung

- Das Node.js-Backend kann direkt auf Render oder einem vergleichbaren Dienst mit `npm start` betrieben werden.
- `WEB_ORIGIN` muss exakt auf den Ursprung des Frontends zeigen.
- Die OAuth-Redirect-URLs müssen sowohl beim jeweiligen Anbieter als auch in den Umgebungsvariablen identisch eingetragen sein.
- `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_ENCRYPTION_KEY` und Anbieter-Schlüssel gehören ausschließlich in die Serverumgebung.
- `config.js` enthält nur die öffentliche Backend-Adresse und darf keine geheimen Schlüssel enthalten.

## Funktionen

- Supabase-E-Mail-Anmeldung
- Verschlüsselte Speicherung von OAuth-Tokens
- Multi-Provider-KI mit GPT, Gemini oder Claude
- Responsive Content-Generator-Oberfläche
- Kopieren und lokale Content-Bibliothek mit bis zu zwölf Entwürfen
- Datenschutz- und Nutzungsbedingungen

