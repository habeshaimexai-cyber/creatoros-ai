import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const frontendUrl = process.env.WEB_ORIGIN || 'https://habeshaimexai-cyber.github.io/creatoros-ai/';
const frontendOrigin = new URL(frontendUrl).origin;

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || origin === frontendOrigin),
  methods: ['GET', 'POST']
}));
app.use(express.json());

const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TOKEN_ENCRYPTION_KEY'];
const configured = () => required.every((key) => Boolean(process.env[key]));
const encryptionKey = () => crypto.createHash('sha256').update(process.env.TOKEN_ENCRYPTION_KEY).digest();

function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

function createState(userId) {
  return seal(JSON.stringify({ userId, exp: Date.now() + 10 * 60 * 1000 }));
}

function readState(state) {
  const [ivText, tagText, encryptedText] = state.split('.');
  if (!ivText || !tagText || !encryptedText) throw new Error('Ungültiger Status');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  const payload = JSON.parse(Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8'));
  if (!payload.userId || payload.exp < Date.now()) throw new Error('Status abgelaufen');
  return payload;
}

async function getCreator(authorization) {
  if (!authorization?.startsWith('Bearer ')) return null;
  const response = await fetch(process.env.SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, authorization }
  });
  return response.ok ? response.json() : null;
}

function finish(res, message, success = false) {
  res.type('html').send('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>CreatorOS</title><main style="font-family:system-ui;max-width:520px;margin:80px auto;padding:24px"><h1>' + (success ? 'YouTube verbunden' : 'Verbindung fehlgeschlagen') + '</h1><p>' + message + '</p><p>Du kannst dieses Fenster schließen und zu CreatorOS zurückgehen.</p></main>');
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'CreatorOS API', youtubeConfigured: configured() }));

app.post('/oauth/youtube/start', async (req, res) => {
  if (!configured()) return res.status(503).json({ error: 'Die sichere YouTube-Verbindung wird noch eingerichtet.' });
  const creator = await getCreator(req.get('authorization'));
  if (!creator?.id) return res.status(401).json({ error: 'Bitte zuerst bei CreatorOS anmelden.' });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    state: createState(creator.id),
    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly'
  });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params);
});

app.get('/oauth/youtube/callback', async (req, res) => {
  try {
    if (!configured()) throw new Error('Der Server ist noch nicht vollständig eingerichtet.');
    if (!req.query.code || !req.query.state) throw new Error('Google hat keine Berechtigung zurückgegeben.');
    const { userId } = readState(String(req.query.state));
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(req.query.code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token) throw new Error('Google-Berechtigung wurde nicht akzeptiert.');

    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { authorization: 'Bearer ' + tokens.access_token }
    });
    const channelData = await channelResponse.json();
    const channel = channelData.items?.[0];
    if (!channel?.id) throw new Error('Kein YouTube-Kanal für dieses Google-Konto gefunden.');

    const connection = {
      user_id: userId,
      platform: 'YOUTUBE',
      account_id: channel.id,
      handle: channel.snippet?.customUrl || channel.snippet?.title || 'YouTube',
      access_token: seal(tokens.access_token),
      refresh_token: tokens.refresh_token ? seal(tokens.refresh_token) : null,
      expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      scopes: String(tokens.scope || '').split(' ').filter(Boolean),
      status: 'ACTIVE'
    };
    const saveResponse = await fetch(process.env.SUPABASE_URL + '/rest/v1/social_connections?on_conflict=platform,account_id', {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify(connection)
    });
    if (!saveResponse.ok) throw new Error('Die Verbindung konnte nicht gespeichert werden.');
    finish(res, 'Dein YouTube-Kanal wurde sicher mit deinem CreatorOS-Konto verbunden.', true);
  } catch (error) {
    finish(res, error instanceof Error ? error.message : 'Unbekannter Fehler.');
  }
});

app.listen(process.env.PORT || 3001, () => console.log('CreatorOS API läuft'));
