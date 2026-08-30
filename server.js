import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors({ origin: process.env.WEB_ORIGIN || 'https://habeshaimexai-cyber.github.io' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'CreatorOS API' }));

app.get('/oauth/youtube/start', (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(503).json({ error: 'YouTube-Verbindung wird eingerichtet.' });
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly'
  });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params);
});

app.listen(process.env.PORT || 3001, () => console.log('CreatorOS API läuft'));
