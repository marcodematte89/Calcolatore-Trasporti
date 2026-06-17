# ShipCalc Pro - Calcolatore Costi di Trasporto

Un'applicazione web moderna per il calcolo dei costi di trasporto basata su province e peso, con sistema di gestione delle tariffe completamente personalizzabile.

## 🚀 Funzionalità Principali

### Calcolatore di Costi
- **Selezione Provincia**: Menu a tendina con tutte le province italiane
- **Inserimento Peso**: Campo numerico per il peso della merce (kg)
- **Calcolo Automatico**: Determinazione del costo in base a fasce di peso predefinite
- **Risultati Chiari**: Visualizzazione immediata del costo calcolato

### Sistema di Gestione Tariffe
- **Pannello Admin**: Interfaccia riservata per la gestione delle tariffe
- **Tabella Tariffe**: Visualizzazione completa delle tariffe per provincia
- **Modifica Online**: Editing diretto delle tariffe con salvataggio immediato
- **Aggiunta/Eliminazione**: Gestione completa delle voci tariffarie

### Importazione/Esportazione CSV
- **Caricamento CSV**: Importazione massiva delle tariffe da file CSV
- **Template CSV**: Download del template preformattato
- **Esportazione Dati**: Salvataggio delle tariffe attuali in formato CSV
- **Validazione Dati**: Controllo automatico dei formati e valori

## 📋 Struttura del Progetto

```
shipping-calculator/
├── index.html          # Pagina principale dell'applicazione
├── script.js           # Logica JavaScript completa
├── styles.css          # Stili CSS personalizzati
└── README.md           # Documentazione del progetto
```

## 🎯 Utilizzo Base

### 1. Calcolo Costo
1. Accedi all'applicazione
2. Seleziona la provincia di destinazione
3. Inserisci il peso della merce
4. Clicca su "Calcola Costo"
5. Visualizza il risultato immediatamente

### 2. Accesso Admin
1. Clicca su "Area Clienti"
2. Inserisci le credenziali:
   - Email: `admin@shipcalc.com`
   - Password: `admin123`
3. Accedi al pannello amministratore

### 3. Gestione Tariffe
1. Dal pannello admin, seleziona la tab "Tariffe Provinciali"
2. Visualizza la tabella completa delle tariffe
3. Clicca sull'icona di modifica per editare una tariffa
4. Salva le modifiche (si applicano immediatamente al calcolatore)

## 📊 Formato CSV

Le tariffe possono essere importate tramite file CSV con la seguente struttura:

```csv
Provincia,Regione,Costo_0_25,Costo_26_50,Costo_51_75,Costo_76_100,Costo_oltre_100
MI,Lombardia,6.996,9.515,12.342,14.586,14.586
RM,Lazio,8.206,10.791,13.376,15.972,15.972
NA,Campania,10.373,12.914,15.444,17.985,17.985
```

### Campi Obbligatori
- **Provincia**: Codice provincia (2 caratteri, es. MI, RM, NA)
- **Regione**: Nome della regione
- **Costo_0_25**: Costo per peso da 0 a 25 kg
- **Costo_26_50**: Costo per peso da 26 a 50 kg
- **Costo_51_75**: Costo per peso da 51 a 75 kg
- **Costo_76_100**: Costo per peso da 76 a 100 kg
- **Costo_oltre_100**: Costo per peso superiore a 100 kg

## 🔧 Configurazione Tecnica

### Tecnologie Utilizzate
- **HTML5**: Struttura semantica della pagina
- **Tailwind CSS**: Framework CSS per design responsive
- **JavaScript Vanilla**: Logica dell'applicazione
- **Font Awesome**: Icone professionali
- **LocalStorage**: Persistenza dei dati localmente

### Caratteristiche Tecniche
- **Responsive Design**: Adattamento automatico a tutti i dispositivi
- **Local Storage**: Salvataggio automatico delle tariffe e configurazioni
- **Validazione Input**: Controllo dei dati inseriti
- **Notifiche**: Sistema di feedback per le operazioni
- **Modali**: Interfacce di editing moderne

## 🚀 Avvio Rapido

1. **Clona il progetto**
2. **Apri `index.html` in un browser moderno**
3. **Inizia a calcolare i costi!**

## 📝 Note Importanti

### Sicurezza
- L'accesso admin è protetto da credenziali
- I dati vengono salvati localmente nel browser
- Nessuna trasmissione di dati a server esterni

### Personalizzazione
- Tutte le tariffe sono completamente modificabili
- È possibile aggiungere nuove province
- Il sistema supporta differenti logiche di calcolo

### Manutenzione
- Backup regolare delle tariffe tramite esportazione CSV
- Validazione dei dati prima dell'importazione
- Sistema di notifiche per feedback immediato

## 🔄 Aggiornamenti Futuri

Il sistema è progettato per essere estensibile. Possibili miglioramenti:
- Autenticazione utenti avanzata
- Database server-side
- Storico dei calcoli
- Reportistica avanzata
- Integrazione con sistemi esterni

---

**ShipCalc Pro** - Il tuo partner affidabile per il calcolo dei costi di trasporto.
