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

## YouTube verbinden

1. Führe in Supabase die Migration `supabase/migrations/202609090001_social_connections.sql` aus.
2. Erstelle in der Google Cloud Console ein Projekt und aktiviere die **YouTube Data API v3**.
3. Konfiguriere den OAuth-Zustimmungsbildschirm. Füge dein Google-Konto als Testnutzer hinzu, solange die App im Testmodus ist.
4. Erstelle eine OAuth-Client-ID vom Typ **Webanwendung**. Trage als autorisierten Redirect exakt `https://creatoros-ai-5t1b.onrender.com/oauth/youtube/callback` ein.
5. Hinterlege auf Render `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, die drei Supabase-Werte und einen zufälligen `TOKEN_ENCRYPTION_KEY`.
6. Setze `WEB_ORIGIN` auf den Ursprung der Website (ohne Pfad), deploye neu und prüfe in `/health`, ob `platforms.youtube` den Wert `true` hat.

Standardmäßig fordert CreatorOS nur Lesezugriff auf den YouTube-Kanal an. Setze `YOUTUBE_ANALYTICS_ENABLED=true` erst, wenn Analytics gebraucht und der zusätzliche Google-Scope freigegeben wurde. Java oder Python sind für diese Verbindung nicht nötig: OAuth und die YouTube Data API laufen vollständig im vorhandenen Node.js-Backend.

## Funktionen

- Supabase-E-Mail-Anmeldung
- Verschlüsselte Speicherung von OAuth-Tokens
- Multi-Provider-KI mit GPT, Gemini oder Claude
- Responsive Content-Generator-Oberfläche
- Kopieren und lokale Content-Bibliothek mit bis zu zwölf Entwürfen
- Datenschutz- und Nutzungsbedingungen
