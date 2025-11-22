const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors({ origin: '*', exposedHeaders: '*' }));

// Genel proxy: her dosyayı geçirir
app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('url parametresi gerekli');

  try {
    const resp = await fetch(url, {
      headers: {
        // Gerekirse UA değiştir:
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
      }
    });

    // İçerik tipini kaynakla uyumlu ilet
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('application/vnd.apple.mpegurl') || url.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (ct.includes('video/mp2t') || url.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    } else {
      res.setHeader('Content-Type', ct || 'application/octet-stream');
    }

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    const buffer = await resp.buffer();
    res.status(resp.status).send(buffer);
  } catch (e) {
    res.status(500).send('Proxy hatası: ' + e.message);
  }
});

// Özel m3u8 endpoint (isteğe bağlı)
app.get('/proxy/m3u8', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('url parametresi gerekli');
  try {
    const resp = await fetch(url);
    const text = await resp.text();

    // İçerideki segment URL’leri relatif ise, player’ın doğrudan orijine gitmesi gerekebilir.
    // İstersen burada segmentleri proxy üzerinden geçecek şekilde yeniden yazabilirsin.
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(text);
  } catch (e) {
    res.status(500).send('m3u8 hatası: ' + e.message);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Proxy çalışıyor: ' + port));
