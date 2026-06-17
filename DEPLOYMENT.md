# Istruzioni per il Deploy di ShipCalc Pro

## Opzioni di Deployment

### 1. GitHub Pages (Gratuito e Consigliato)

**Vantaggi:**
- Completamente gratuito
- Hosting su CDN globale
- HTTPS automatico
- Dominio personalizzato disponibile
- Facile configurazione

**Passaggi:**

1. **Crea un repository GitHub**
   - Vai su https://github.com e crea un nuovo repository
   - Chiama il repository "shipcalc-pro" o simile

2. **Carica i file**
   ```bash
   cd C:\Users\marco\CascadeProjects\shipping-calculator
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TUO_USERNAME/shipcalc-pro.git
   git push -u origin main
   ```

3. **Attiva GitHub Pages**
   - Vai su Settings > Pages del repository
   - Seleziona "main" come branch
   - Seleziona "/ (root)" come directory
   - Clicca "Save"
   - Dopo 1-2 minuti, il sito sarà disponibile all'URL: `https://TUO_USERNAME.github.io/shipcalc-pro/`

### 2. Netlify (Gratuito)

**Vantaggi:**
- Deploy automatico da Git
- HTTPS automatico
- Dominio personalizzato gratuito
- Funzionalità avanzate

**Passaggi:**

1. **Crea account Netlify**
   - Vai su https://netlify.com e registrati gratuitamente

2. **Carica i file**
   - Trascina la cartella `shipping-calculator` nel dashboard di Netlify
   - Oppure connetti il repository GitHub

3. **Configura il sito**
   - Netlify creerà automaticamente il sito
   - Sito disponibile all'URL: `https://random-name.netlify.app`

### 3. Vercel (Gratuito)

**Vantaggi:**
- Deploy automatico da Git
- Performance eccellente
- HTTPS automatico
- Edge network globale

**Passaggi:**

1. **Crea account Vercel**
   - Vai su https://vercel.com e registrati gratuitamente

2. **Importa il progetto**
   - Clicca "New Project"
   - Importa da GitHub o carica i file manualmente

3. **Deploy**
   - Vercel creerà automaticamente il sito
   - Sito disponibile all'URL: `https://shipcalc-pro.vercel.app`

### 4. Hosting Tradizionale (cPanel, Plesk, ecc.)

**Vantaggi:**
- Controllo completo
- Supporto per database
- Email inclusa

**Passaggi:**

1. **Prepara i file**
   - Assicurati che tutti i file siano nella cartella `public_html` o simile

2. **Carica via FTP**
   - Usa FileZilla o simile
   - Carica tutti i file (index.html, script.js, styles.css)

3. **Configura il dominio**
   - Il sito sarà disponibile al tuo dominio

## File Necessari per il Deploy

Assicurati di avere questi file nella cartella del progetto:
- `index.html` - Pagina principale
- `script.js` - Logica JavaScript
- `styles.css` - Stili CSS
- `README.md` - Documentazione (opzionale)

## Note Importanti

### Sicurezza
- Il sistema usa localStorage per salvare i dati (tariffe, regole, sessioni)
- Per un ambiente di produzione, considera di:
  - Implementare un backend vero con database
  - Usare autenticazione sicura (JWT, OAuth)
  - Proteggere le API con rate limiting

### Performance
- Il sito usa CDN per Tailwind CSS e Font Awesome
- Considera di ottimizzare le immagini se ne aggiungi
- Usa lazy loading per contenuti pesanti

### SEO
- Aggiungi meta tag SEO in index.html
- Crea un sitemap.xml
- Configura robots.txt

### Monitoraggio
- Considera di aggiungere Google Analytics
- Usa strumenti di monitoraggio errori (Sentry, ecc.)

## Dominio Personalizzato

Per usare un dominio personalizzato (es. shipcalc.tuodominio.com):

1. **Compra il dominio** da un registrar (Namecheap, GoDaddy, ecc.)
2. **Configura i DNS** per puntare al tuo hosting
3. **Aggiungi il dominio** nelle impostazioni del tuo hosting

## Supporto

Per problemi di deployment:
- GitHub Pages: https://docs.github.com/pages
- Netlify: https://docs.netlify.com
- Vercel: https://vercel.com/docs

## Raccomandazione

Per iniziare, **raccomando GitHub Pages** perché:
- È completamente gratuito
- Facile da configurare
- Affidabile e veloce
- Non richiede conoscenze tecniche avanzate
- Perfetto per siti statici come questo
