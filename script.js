// Application State
let currentUser = null;
let tariffeProvinciali = {};
let regoleCalcolo = {};
let currentCalculation = null;

// Mock user data
const users = {
    'logistica@esaving.eu': {
        email: 'logistica@esaving.eu',
        password: '123456',
        role: 'admin',
        name: 'Amministratore',
        mustChangePassword: false
    }
};

// Default rates table - can be overridden by admin
const defaultTariffeProvinciali = {
    'MI': { nome: 'Milano', sigla: '', regione: 'Lombardia', costi: [6.996, 9.515, 12.342, 14.586, 14.586] },
    'RM': { nome: 'Roma', sigla: '', regione: 'Lazio', costi: [8.206, 10.791, 13.376, 15.972, 15.972] },
    'NA': { nome: 'Napoli', sigla: '', regione: 'Campania', costi: [10.373, 12.914, 15.444, 17.985, 17.985] },
    'TO': { nome: 'Torino', sigla: '', regione: 'Piemonte', costi: [6.303, 8.822, 11.605, 13.893, 13.893] },
    'GE': { nome: 'Genova', sigla: '', regione: 'Liguria', costi: [13.963, 17.989, 22.301, 25.997, 25.997] },
    'BO': { nome: 'Bologna', sigla: '', regione: 'Emilia-Romagna', costi: [8.206, 10.791, 13.376, 15.972, 15.972] },
    'FI': { nome: 'Firenze', sigla: '', regione: 'Toscana', costi: [8.206, 10.791, 13.376, 15.972, 15.972] },
    'VE': { nome: 'Venezia', sigla: '', regione: 'Veneto', costi: [7.37, 10.703, 14.311, 17.402, 17.402] },
    'BA': { nome: 'Bari', sigla: '', regione: 'Puglia', costi: [10.373, 12.914, 15.444, 17.985, 17.985] },
    'CA': { nome: 'Cagliari', sigla: '', regione: 'Sardegna', costi: [11.473, 17.975, 24.477, 30.979, 30.979] },
    'PA': { nome: 'Palermo', sigla: '', regione: 'Sicilia', costi: [10.373, 12.914, 15.444, 17.985, 17.985] },
    'AN': { nome: 'Ancona', sigla: '', regione: 'Marche', costi: [20.889, 20.889, 20.889, 20.889, 20.889] },
    'AQ': { nome: 'L\'Aquila', sigla: '', regione: 'Abruzzo', costi: [8.206, 10.791, 13.376, 15.972, 15.972] },
    'TN': { nome: 'Trento', sigla: '', regione: 'Trentino-Alto Adige', costi: [9.361, 12.045, 14.729, 17.413, 17.413] },
    'PZ': { nome: 'Potenza', sigla: '', regione: 'Basilicata', costi: [11.473, 17.975, 24.477, 30.979, 30.979] }
};

// Default calculation rules - can be overridden by admin
const defaultRegoleCalcolo = {
    'VIAGGIO ADR': { valore: '10%', unita: 'DEL NOLO' },
    'SPONDA IDRAULICA': { valore: '15', unita: '' },
    'PREAVVISO TEL.': { valore: '3,2', unita: '' },
    'DIRITTO FISSO': { valore: '1,2', unita: 'A SPEDIZIONE' },
    'ASSICURAZIONE': { valore: '0,5', unita: 'OGNI 100 KG' },
    'FUEL ADDIZIONALE 995 e 996': { valore: '+4% +8,3%', unita: 'SUL COSTO DELLA SPEDIZIONE' },
    'PALLET SFUSO': { valore: '32', unita: 'A PALLET' },
    'LIGURIA E COSTIERA': { valore: '5,24€', unita: 'A QUINTALE' },
    'FASCI': { valore: '22,5', unita: 'OGNI SEGMENTO' },
    'PREPARAZIONE MERCE': { valore: '3,89', unita: 'FISSO' },
    'COSTO PER RIGA': { valore: '1,20€', unita: 'A RIGA' },
    'INCREMENTO 2026': { valore: '5%', unita: 'DEL TOTALE' }
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    loadRates();
    loadRules();
    populateProvinces();
    
    // Check if user is already logged in
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (loggedInUser) {
        currentUser = JSON.parse(loggedInUser);
        updateUIForLoggedInUser();
        showSection('calculator');
    } else {
        showSection('login');
    }
    
    // File input handlers
    const csvFileInput = document.getElementById('csvFileInput');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', handleFileSelect);
    }
    
    // Admin link handler
    const adminLinkBtn = document.getElementById('adminLinkBtn');
    if (adminLinkBtn) {
        adminLinkBtn.addEventListener('click', function() {
            showSection('admin');
        });
    }
    
    // Navigation links
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('href').substring(1);
            showSection(section);
        });
    });
    
    // Other event listeners
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            const mobileMenu = document.getElementById('mobileMenu');
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Mobile admin link
    const adminLinkBtnMobile = document.getElementById('adminLinkBtnMobile');
    if (adminLinkBtnMobile) {
        adminLinkBtnMobile.addEventListener('click', function() {
            showSection('admin');
            document.getElementById('mobileMenu').classList.add('hidden');
        });
    }
    
    // Mobile logout
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', function() {
            logout();
            document.getElementById('mobileMenu').classList.add('hidden');
        });
    }
});

function showSection(section) {
    // Hide all sections
    document.getElementById('calculatorSection').classList.add('hidden');
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('adminSection').classList.add('hidden');
    document.getElementById('savedSection').classList.add('hidden');
    
    // Show selected section
    if (section === 'calculator') {
        document.getElementById('calculatorSection').classList.remove('hidden');
    } else if (section === 'login') {
        document.getElementById('loginSection').classList.remove('hidden');
    } else if (section === 'admin') {
        document.getElementById('adminSection').classList.remove('hidden');
        loadRates();
    } else if (section === 'saved') {
        document.getElementById('savedSection').classList.remove('hidden');
        loadSavedCalculations();
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (users[email] && users[email].password === password) {
        currentUser = users[email];
        localStorage.setItem('loggedInUser', JSON.stringify(currentUser));
        updateUIForLoggedInUser();
        
        // Check if user must change password
        if (currentUser.mustChangePassword) {
            showChangePasswordModal();
        } else {
            showSection('calculator');
            showNotification('Login effettuato con successo!', 'success');
        }
    } else {
        showNotification('Credenziali non valide', 'error');
    }
}

function updateUIForLoggedInUser() {
    // Show user menu and logout button
    document.getElementById('userMenuBtn').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.name;
    
    // Show admin link if user is admin
    if (currentUser.role === 'admin') {
        document.getElementById('adminLinkBtn').classList.remove('hidden');
    }
    
    // Show saved calculations link
    document.getElementById('savedCalculationsLink').classList.remove('hidden');
    document.getElementById('savedCalculationsLinkMobile').classList.remove('hidden');
    
    // Hide login link
    document.querySelector('nav a[href="#login"]').classList.add('hidden');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('loggedInUser');
    
    // Update UI
    document.getElementById('userMenuBtn').classList.add('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('adminLinkBtn').classList.add('hidden');
    document.getElementById('savedCalculationsLink').classList.add('hidden');
    document.getElementById('savedCalculationsLinkMobile').classList.add('hidden');
    document.querySelector('nav a[href="#login"]').classList.remove('hidden');
    
    showSection('login');
    showNotification('Logout effettuato', 'info');
}

function populateProvinces() {
    const select = document.getElementById('provincia');
    select.innerHTML = '<option value="">Seleziona provincia</option>';
    
    Object.keys(tariffeProvinciali).sort().forEach(provincia => {
        const dati = tariffeProvinciali[provincia];
        if (dati) {
            const option = document.createElement('option');
            option.value = provincia;
            // Usa il campo sigla se disponibile, altrimenti usa la chiave
            const sigla = dati.sigla || provincia;
            option.textContent = `${dati.nome} - ${sigla}`;
            select.appendChild(option);
        }
    });
}

function calculateCost() {
    const provincia = document.getElementById('provincia').value;
    const peso = parseFloat(document.getElementById('peso').value);
    const sponda = document.getElementById('sponda').value;
    const batteria = document.getElementById('batteria').value;
    const fascio = document.getElementById('fascio').value;
    const palletSfuso = document.getElementById('palletSfuso').value;
    const numeroRighe = parseInt(document.getElementById('numeroRighe').value) || 0;
    
    if (!provincia || !peso) {
        showNotification('Per favore compila tutti i campi obbligatori', 'error');
        return;
    }
    
    const datiProvincia = tariffeProvinciali[provincia];
    if (!datiProvincia) {
        showNotification('Provincia non trovata nelle tariffe', 'error');
        return;
    }
    
    // Calcolo del nolo iniziale
    const noloBase = getCostoNoloBase(provincia, peso);
    let noloFinale = noloBase;
    let moltiplicatoreQuintali = 1;
    
    // Oltre i 100 kg, moltiplica per il numero di quintali in eccesso
    if (peso > 100) {
        const quintali = Math.ceil(peso / 100);
        moltiplicatoreQuintali = quintali;
        noloFinale = noloBase * moltiplicatoreQuintali;
    }
    
    // Calcolo delle regole aggiuntive
    let viaggioADRCosto = 0;
    let spondaIdraulicaCosto = 0;
    let dirittoFissoCosto = 0;
    let preavvisoTelCosto = 0;
    let preparazioneMerceCosto = 0;
    let assicurazioneCosto = 0;
    let fasciCosto = 0;
    let palletSfusoCosto = 0;
    let costoPerRigaCosto = 0;
    let fuelCosto = 0;
    let incremento2026Costo = 0;
    
    // Regola VIAGGIO ADR (se batteria = sì)
    if (batteria === 'si') {
        const adrPercentuale = getRegolaValue('VIAGGIO ADR');
        viaggioADRCosto = noloFinale * (adrPercentuale / 100);
    }
    
    // Regola SPONDA IDRAULICA (se sponda = sì)
    if (sponda === 'si') {
        spondaIdraulicaCosto = getRegolaValue('SPONDA IDRAULICA');
    }
    
    // Costi fissi
    dirittoFissoCosto = getRegolaValue('DIRITTO FISSO');
    preavvisoTelCosto = getRegolaValue('PREAVVISO TEL.');
    preparazioneMerceCosto = getRegolaValue('PREPARAZIONE MERCE');
    
    // Regola ASSICURAZIONE (ogni 100 kg)
    const assicurazioneBase = getRegolaValue('ASSICURAZIONE');
    const quintaliAssicurazione = Math.ceil(peso / 100);
    assicurazioneCosto = assicurazioneBase * quintaliAssicurazione;
    
    // Regola FASCI
    if (fascio !== 'no') {
        const fasciBase = getRegolaValue('FASCI');
        if (fascio === '3-4') {
            fasciCosto = fasciBase;
        } else if (fascio === '4-5') {
            fasciCosto = fasciBase * 2;
        } else if (fascio === 'oltre5') {
            fasciCosto = fasciBase * 3;
        }
    }
    
    // Regola PALLET SFUSO (se palletSfuso = sì)
    if (palletSfuso === 'si') {
        palletSfusoCosto = getRegolaValue('PALLET SFUSO');
    }
    
    // Regola COSTO PER RIGA
    const costoPerRigaBase = getRegolaValue('COSTO PER RIGA');
    costoPerRigaCosto = numeroRighe * costoPerRigaBase;
    
    // Calcolo somma parziale per fuel e incremento
    const sommaParziale = noloFinale + viaggioADRCosto + spondaIdraulicaCosto + dirittoFissoCosto + preavvisoTelCosto + preparazioneMerceCosto + assicurazioneCosto + fasciCosto + palletSfusoCosto + costoPerRigaCosto;
    
    // Regola FUEL ADDIZIONALE 995 e 996 (somma delle percentuali)
    const fuelPercentuale = getFuelPercentuale();
    fuelCosto = sommaParziale * (fuelPercentuale / 100);
    
    // Calcolo somma prima di incremento 2026
    const sommaPrimaIncremento = sommaParziale + fuelCosto;
    
    // Regola INCREMENTO 2026
    const incrementoPercentuale = getRegolaValue('INCREMENTO 2026');
    incremento2026Costo = sommaPrimaIncremento * (incrementoPercentuale / 100);
    
    // Calcolo totale finale
    const totale = sommaPrimaIncremento + incremento2026Costo;
    
    // Salva il calcolo corrente
    currentCalculation = {
        provincia: provincia,
        peso: peso,
        sponda: sponda,
        batteria: batteria,
        fascio: fascio,
        palletSfuso: palletSfuso,
        numeroRighe: numeroRighe,
        result: {
            provincia: `${provincia} - ${datiProvincia.nome}`,
            regione: datiProvincia.regione,
            peso: peso,
            sponda: sponda,
            batteria: batteria,
            fascio: fascio,
            palletSfuso: palletSfuso,
            numeroRighe: numeroRighe,
            noloBase: noloBase,
            moltiplicatoreQuintali: moltiplicatoreQuintali,
            noloFinale: noloFinale,
            viaggioADRCosto: viaggioADRCosto,
            spondaIdraulicaCosto: spondaIdraulicaCosto,
            dirittoFissoCosto: dirittoFissoCosto,
            preavvisoTelCosto: preavvisoTelCosto,
            preparazioneMerceCosto: preparazioneMerceCosto,
            assicurazioneCosto: assicurazioneCosto,
            fasciCosto: fasciCosto,
            palletSfusoCosto: palletSfusoCosto,
            costoPerRigaCosto: costoPerRigaCosto,
            fuelCosto: fuelCosto,
            incremento2026Costo: incremento2026Costo,
            totale: totale
        }
    };
    
    displayCalculationResult({
        provincia: `${provincia} - ${datiProvincia.nome}`,
        regione: datiProvincia.regione,
        peso: peso,
        sponda: sponda,
        batteria: batteria,
        fascio: fascio,
        palletSfuso: palletSfuso,
        numeroRighe: numeroRighe,
        noloBase: noloBase,
        moltiplicatoreQuintali: moltiplicatoreQuintali,
        noloFinale: noloFinale,
        viaggioADRCosto: viaggioADRCosto,
        spondaIdraulicaCosto: spondaIdraulicaCosto,
        dirittoFissoCosto: dirittoFissoCosto,
        preavvisoTelCosto: preavvisoTelCosto,
        preparazioneMerceCosto: preparazioneMerceCosto,
        assicurazioneCosto: assicurazioneCosto,
        fasciCosto: fasciCosto,
        palletSfusoCosto: palletSfusoCosto,
        costoPerRigaCosto: costoPerRigaCosto,
        fuelCosto: fuelCosto,
        incremento2026Costo: incremento2026Costo,
        totale: totale
    });
}

function getFuelPercentuale() {
    const regola = regoleCalcolo['FUEL ADDIZIONALE 995 e 996'];
    if (!regola) return 0;
    
    // Estrai le percentuali dalla stringa "+4% +8,3%"
    let valore = regola.valore;
    const matches = valore.match(/(\d+[\.,]\d+|\d+)%/g);
    
    if (matches && matches.length > 0) {
        let totalePercentuale = 0;
        matches.forEach(match => {
            let percentuale = match.replace('%', '').replace(',', '.');
            totalePercentuale += parseFloat(percentuale) || 0;
        });
        return totalePercentuale;
    }
    
    return 0;
}

function getRegolaValue(nomeRegola) {
    const regola = regoleCalcolo[nomeRegola];
    if (!regola) return 0;
    
    // Estrai il valore numerico dalla stringa (rimuovi %, €, ecc.)
    let valore = regola.valore.replace(',', '.').replace('%', '').replace('€', '').trim();
    return parseFloat(valore) || 0;
}

function getCostoNoloBase(provincia, peso) {
    const datiProvincia = tariffeProvinciali[provincia];
    if (!datiProvincia) {
        return 0;
    }
    
    // Per province con costo a quintale (es. Ancona), calcola in base al peso
    if (provincia === 'AN') {
        // 20.889€ a quintale (100kg), arrotonda peso a 100kg superiori
        const quintali = Math.ceil(peso / 100);
        return 20.889 * quintali;
    }
    
    // Per altre province, usa le fasce di peso
    let colonnaIndex;
    if (peso <= 25) {
        colonnaIndex = 0; // 0-25kg
    } else if (peso <= 50) {
        colonnaIndex = 1; // 26-50kg
    } else if (peso <= 75) {
        colonnaIndex = 2; // 51-75kg
    } else if (peso <= 100) {
        colonnaIndex = 3; // 76-100kg
    } else {
        colonnaIndex = 4; // >100kg (base rate, poi moltiplicato per quintali)
    }
    
    return datiProvincia.costi[colonnaIndex];
}

function displayCalculationResult(result) {
    const resultDiv = document.getElementById('calculationResult');
    const actionButtons = document.getElementById('actionButtons');
    
    // Calcolo Fermo Deposito (pallet sfuso + costo per riga + preparazione merce)
    const fermoDeposito = result.palletSfusoCosto + result.costoPerRigaCosto + result.preparazioneMerceCosto;
    
    resultDiv.innerHTML = `
        <div class="space-y-4">
            <!-- Riepilogo Dati -->
            <div class="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <h4 class="font-semibold text-white mb-3 flex items-center">
                    <i class="fas fa-info-circle mr-2 text-blue-400"></i> Riepilogo Dati
                </h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-white/60">Provincia:</span>
                        <span class="font-medium text-white">${result.provincia}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-white/60">Regione:</span>
                        <span class="font-medium text-white">${result.regione}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-white/60">Peso:</span>
                        <span class="font-medium text-white">${result.peso} kg</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-white/60">Sponda Idraulica:</span>
                        <span class="font-medium text-white">${result.sponda === 'si' ? 'Sì' : 'No'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-white/60">Batteria:</span>
                        <span class="font-medium text-white">${result.batteria === 'si' ? 'Sì' : 'No'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-white/60">Fascio:</span>
                        <span class="font-medium text-white">${result.fascio === 'no' ? 'No' : result.fascio}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-white/60">Pallet Moduli Sfusi:</span>
                        <span class="font-medium text-white">${result.palletSfuso === 'si' ? 'Sì' : 'No'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-white/60">Numero Righe d'Ordine:</span>
                        <span class="font-medium text-white">${result.numeroRighe}</span>
                    </div>
                </div>
            </div>
            
            <!-- Risultati Finali -->
            <div class="space-y-4">
                <div class="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <div class="flex justify-between items-center">
                        <span class="text-white font-semibold text-lg">Costo Logistica + Trasporto:</span>
                        <span class="text-4xl font-bold text-white">€ ${Math.round(result.totale)}</span>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <div class="flex justify-between items-center">
                        <span class="text-white font-semibold text-lg">Fermo Deposito:</span>
                        <span class="text-4xl font-bold text-white">€ ${Math.round(fermoDeposito)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Mostra i pulsanti di azione
    actionButtons.classList.remove('hidden');
}

function resetCalculator() {
    // Resetta tutti i campi del form
    document.getElementById('provincia').value = '';
    document.getElementById('peso').value = '';
    
    // Resetta i risultati
    document.getElementById('calculationResult').innerHTML = `
        <div class="text-center text-gray-500 py-8">
            <i class="fas fa-info-circle text-4xl mb-3"></i>
            <p>Inserisci provincia e peso per calcolare i costi</p>
        </div>
    `;
    
    // Nascondi i pulsanti di azione
    document.getElementById('actionButtons').classList.add('hidden');
    
    showNotification('Calcolatore resettato', 'info');
}

// Admin Panel Functions
function showAdminTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const content = document.getElementById(tabName + 'TabContent');
    if (content) {
        content.classList.add('active');
    }
    
    // Add active class to selected tab
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) {
        tab.classList.add('active');
    }
    
    // Load tab-specific content
    if (tabName === 'rates') {
        loadRatesTable();
    } else if (tabName === 'rules') {
        loadRulesTable();
    } else if (tabName === 'users') {
        loadUsersTable();
    }
}

function loadRates() {
    // Load rates from localStorage or use defaults
    const savedRates = localStorage.getItem('tariffeProvinciali');
    if (savedRates) {
        tariffeProvinciali = JSON.parse(savedRates);
        // Add sigla field if missing
        Object.keys(tariffeProvinciali).forEach(provincia => {
            if (!tariffeProvinciali[provincia].sigla) {
                tariffeProvinciali[provincia].sigla = '';
            }
        });
    } else {
        tariffeProvinciali = {...defaultTariffeProvinciali};
        saveRates();
    }
}

function saveRates() {
    localStorage.setItem('tariffeProvinciali', JSON.stringify(tariffeProvinciali));
}

function loadRules() {
    // Load rules from localStorage or use defaults
    const savedRules = localStorage.getItem('regoleCalcolo');
    if (savedRules) {
        regoleCalcolo = JSON.parse(savedRules);
    } else {
        regoleCalcolo = {...defaultRegoleCalcolo};
        saveRules();
    }
}

function saveRules() {
    localStorage.setItem('regoleCalcolo', JSON.stringify(regoleCalcolo));
}

function loadRatesTable() {
    const tbody = document.getElementById('ratesTableBody');
    tbody.innerHTML = '';
    
    Object.keys(tariffeProvinciali).sort().forEach(provincia => {
        const dati = tariffeProvinciali[provincia];
        if (dati) {
            const row = document.createElement('tr');
            row.className = 'editable-rate';
            row.innerHTML = `
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${provincia}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${dati.sigla || ''}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${dati.regione}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">€ ${dati.costi[0].toFixed(3)}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">€ ${dati.costi[1].toFixed(3)}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">€ ${dati.costi[2].toFixed(3)}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">€ ${dati.costi[3].toFixed(3)}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">€ ${dati.costi[4].toFixed(3)}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onclick="editRate('${provincia}')" class="text-blue-600 hover:text-blue-800 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteRate('${provincia}')" class="text-red-600 hover:text-red-800 mr-2">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
    });
}

function editRate(provincia) {
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');
    const dati = tariffeProvinciali[provincia];
    
    if (!dati) return;
    
    content.innerHTML = `
        <form id="rateEditForm" class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Modifica Tariffa: ${provincia} - ${dati.nome}</h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Provincia</label>
                    <input type="text" value="${provincia}" disabled class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nome Provincia</label>
                    <input type="text" id="editRateNome" value="${dati.nome}" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Sigla</label>
                    <input type="text" id="editRateSigla" value="${dati.sigla || ''}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="es. MI">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Regione</label>
                    <input type="text" id="editRateRegione" value="${dati.regione}" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Costo 0-25kg</label>
                    <input type="number" id="editRate0" value="${dati.costi[0]}" step="0.001" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Costo 26-50kg</label>
                    <input type="number" id="editRate1" value="${dati.costi[1]}" step="0.001" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Costo 51-75kg</label>
                    <input type="number" id="editRate2" value="${dati.costi[2]}" step="0.001" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Costo 76-100kg</label>
                    <input type="number" id="editRate3" value="${dati.costi[3]}" step="0.001" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Costo >100kg</label>
                    <input type="number" id="editRate4" value="${dati.costi[4]}" step="0.001" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
            </div>
            
            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onclick="closeRateModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition">
                    Annulla
                </button>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-save mr-2"></i> Salva Modifiche
                </button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    
    document.getElementById('rateEditForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveRateEdit(provincia);
    });
}

function saveRateEdit(provincia) {
    const costi = [
        parseFloat(document.getElementById('editRate0').value) || 0,
        parseFloat(document.getElementById('editRate1').value) || 0,
        parseFloat(document.getElementById('editRate2').value) || 0,
        parseFloat(document.getElementById('editRate3').value) || 0,
        parseFloat(document.getElementById('editRate4').value) || 0
    ];
    
    tariffeProvinciali[provincia] = {
        nome: document.getElementById('editRateNome').value,
        sigla: document.getElementById('editRateSigla').value,
        regione: document.getElementById('editRateRegione').value,
        costi: costi
    };
    
    saveRates();
    closeRateModal();
    loadRatesTable();
    populateProvinces(); // Update province dropdown
    showNotification(`Tariffa ${provincia} aggiornata con successo!`, 'success');
}

function closeRateModal() {
    document.getElementById('rateModal').classList.add('hidden');
}

function deleteRate(provincia) {
    if (confirm(`Sei sicuro di voler eliminare la tariffa ${provincia}?`)) {
        delete tariffeProvinciali[provincia];
        saveRates();
        loadRatesTable();
        populateProvinces(); // Update province dropdown
        showNotification(`Tariffa ${provincia} eliminata con successo!`, 'success');
    }
}

function addNewRate() {
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');
    
    content.innerHTML = `
        <form id="newRateForm" class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Aggiungi Nuova Tariffa</h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Codice Provincia</label>
                    <input type="text" id="newRateCodice" maxlength="2" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="es. MI">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nome Provincia</label>
                    <input type="text" id="newRateNome" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="es. Milano">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Sigla</label>
                    <input type="text" id="newRateSigla" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="es. MI">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Regione</label>
                    <input type="text" id="newRateRegione" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="es. Lombardia">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Costo 0-25kg</label>
                    <input type="number" id="newRate0" step="0.001" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Costo 26-50kg</label>
                    <input type="number" id="newRate1" step="0.001" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Costo 51-75kg</label>
                    <input type="number" id="newRate2" step="0.001" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Costo 76-100kg</label>
                    <input type="number" id="newRate3" step="0.001" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Costo >100kg</label>
                    <input type="number" id="newRate4" step="0.001" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
            </div>
            
            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onclick="closeRateModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition">
                    Annulla
                </button>
                <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                    <i class="fas fa-plus mr-2"></i> Aggiungi Tariffa
                </button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    
    document.getElementById('newRateForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveNewRate();
    });
}

function saveNewRate() {
    const codice = document.getElementById('newRateCodice').value.toUpperCase();
    const nome = document.getElementById('newRateNome').value;
    const sigla = document.getElementById('newRateSigla').value;
    const regione = document.getElementById('newRateRegione').value;
    const costi = [
        parseFloat(document.getElementById('newRate0').value) || 0,
        parseFloat(document.getElementById('newRate1').value) || 0,
        parseFloat(document.getElementById('newRate2').value) || 0,
        parseFloat(document.getElementById('newRate3').value) || 0,
        parseFloat(document.getElementById('newRate4').value) || 0
    ];
    
    tariffeProvinciali[codice] = {
        nome: nome,
        sigla: sigla,
        regione: regione,
        costi: costi
    };
    
    saveRates();
    closeRateModal();
    loadRatesTable();
    populateProvinces(); // Update province dropdown
    showNotification(`Nuova tariffa ${codice} aggiunta con successo!`, 'success');
}

// Rules Management Functions
function loadRulesTable() {
    const tbody = document.getElementById('rulesTableBody');
    tbody.innerHTML = '';
    
    Object.keys(regoleCalcolo).sort().forEach(nomeRegola => {
        const dati = regoleCalcolo[nomeRegola];
        if (dati) {
            const row = document.createElement('tr');
            row.className = 'editable-rate';
            row.innerHTML = `
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${nomeRegola}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${dati.valore}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${dati.unita || '-'}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onclick="editRule('${nomeRegola}')" class="text-blue-600 hover:text-blue-800 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteRule('${nomeRegola}')" class="text-red-600 hover:text-red-800 mr-2">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
    });
}

function editRule(nomeRegola) {
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');
    const dati = regoleCalcolo[nomeRegola];
    
    if (!dati) return;
    
    content.innerHTML = `
        <form id="ruleEditForm" class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Modifica Regola: ${nomeRegola}</h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nome Regola</label>
                    <input type="text" value="${nomeRegola}" disabled class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Valore</label>
                    <input type="text" id="editRuleValore" value="${dati.valore}" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700">Unità di Misura</label>
                    <input type="text" id="editRuleUnita" value="${dati.unita}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="es. DEL NOLO, A SPEDIZIONE, OGNI 100 KG">
                </div>
            </div>
            
            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onclick="closeRateModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition">
                    Annulla
                </button>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-save mr-2"></i> Salva Modifiche
                </button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    
    document.getElementById('ruleEditForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveRuleEdit(nomeRegola);
    });
}

function saveRuleEdit(nomeRegola) {
    regoleCalcolo[nomeRegola] = {
        valore: document.getElementById('editRuleValore').value,
        unita: document.getElementById('editRuleUnita').value
    };
    
    saveRules();
    closeRateModal();
    loadRulesTable();
    showNotification(`Regola ${nomeRegola} aggiornata con successo!`, 'success');
}

function deleteRule(nomeRegola) {
    if (confirm(`Sei sicuro di voler eliminare la regola ${nomeRegola}?`)) {
        delete regoleCalcolo[nomeRegola];
        saveRules();
        loadRulesTable();
        showNotification(`Regola ${nomeRegola} eliminata con successo!`, 'success');
    }
}

function addNewRule() {
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');
    
    content.innerHTML = `
        <form id="newRuleForm" class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Aggiungi Nuova Regola</h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700">Nome Regola</label>
                    <input type="text" id="newRuleNome" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="es. VIAGGIO ADR">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Valore</label>
                    <input type="text" id="newRuleValore" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="es. 10% o 15">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Unità di Misura</label>
                    <input type="text" id="newRuleUnita" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="es. DEL NOLO, A SPEDIZIONE">
                </div>
            </div>
            
            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onclick="closeRateModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition">
                    Annulla
                </button>
                <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                    <i class="fas fa-plus mr-2"></i> Aggiungi Regola
                </button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    
    document.getElementById('newRuleForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveNewRule();
    });
}

function saveNewRule() {
    const nome = document.getElementById('newRuleNome').value;
    const valore = document.getElementById('newRuleValore').value;
    const unita = document.getElementById('newRuleUnita').value;
    
    regoleCalcolo[nome] = {
        valore: valore,
        unita: unita
    };
    
    saveRules();
    closeRateModal();
    loadRulesTable();
    showNotification(`Nuova regola ${nome} aggiunta con successo!`, 'success');
}

function downloadRules() {
    // Create CSV content
    let csvContent = 'Nome Regola;Valore;Unità di Misura\n';
    
    Object.keys(regoleCalcolo).sort().forEach(nomeRegola => {
        const dati = regoleCalcolo[nomeRegola];
        if (dati) {
            csvContent += `${nomeRegola};${dati.valore};${dati.unita}\n`;
        }
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'regole_calcolo.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Regole CSV scaricate con successo!', 'success');
}

// CSV Upload Functions
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Solo gli amministratori possono caricare file CSV', 'error');
        return;
    }
    
    document.getElementById('csvFileName').textContent = file.name;
    processCSVFile(file);
}

function processCSVFile(file) {
    const statusDiv = document.getElementById('csvUploadStatus');
    const resultDiv = document.getElementById('csvUploadResult');
    
    // Show loading status
    statusDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = parseCSV(e.target.result);
            updateTariffeProvinciali(csvData);
            
            statusDiv.classList.add('hidden');
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <i class="fas fa-check-circle text-green-600 mr-3"></i>
                        <div>
                            <p class="text-green-800 font-semibold">Caricamento completato con successo!</p>
                            <p class="text-green-700 text-sm">Caricate ${csvData.length} province</p>
                            <p class="text-green-600 text-xs mt-2">Le tariffe precedenti sono state sostituite completamente</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Update tables and dropdown
            loadRatesTable();
            populateProvinces();
            showNotification('Tariffe aggiornate con successo!', 'success');
        } catch (error) {
            statusDiv.classList.add('hidden');
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <i class="fas fa-exclamation-circle text-red-600 mr-3"></i>
                        <div>
                            <p class="text-red-800 font-semibold">Errore durante il caricamento</p>
                            <p class="text-red-700 text-sm">${error.message}</p>
                        </div>
                    </div>
                </div>
            `;
            
            showNotification('Errore durante il caricamento del CSV', 'error');
        }
    };
    
    reader.onerror = function() {
        statusDiv.classList.add('hidden');
        resultDiv.classList.remove('hidden');
        resultDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex items-center">
                    <i class="fas fa-exclamation-circle text-red-600 mr-3"></i>
                    <p class="text-red-800 font-semibold">Errore durante la lettura del file</p>
                </div>
            </div>
        `;
        
        showNotification('Errore durante la lettura del file', 'error');
    };
    
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
        throw new Error('Il file CSV deve contenere almeno una riga di dati oltre all\'intestazione');
    }
    
    // Auto-detect separator (comma or semicolon)
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    
    const headers = firstLine.split(separator).map(h => h.trim());
    const data = [];
    const errors = [];
    
    // Check required headers
    const requiredHeaders = ['Provincia', 'Sigla', 'Regione', 'Costo_0_25', 'Costo_26_50', 'Costo_51_75', 'Costo_76_100', 'Costo_oltre_100'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
        throw new Error(`Intestazioni mancanti: ${missingHeaders.join(', ')}`);
    }
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split(separator).map(v => v.trim());
        
        if (values.length < 8) {
            errors.push(`Riga ${i + 1}: numero di colonne insufficiente (${values.length}/8 richieste)`);
            continue;
        }
        
        const provincia = values[0];
        const sigla = values[1];
        const regione = values[2];
        
        if (!provincia || provincia.trim() === '') {
            errors.push(`Riga ${i + 1}: provincia mancante`);
            continue;
        }
        
        if (!regione || regione.trim() === '') {
            errors.push(`Riga ${i + 1}: regione mancante per provincia ${provincia}`);
            continue;
        }
        
        // Parse costs with better error handling
        const costi = [];
        for (let j = 3; j <= 7; j++) {
            const value = values[j].replace(',', '.');
            const parsed = parseFloat(value);
            if (isNaN(parsed) || parsed < 0) {
                errors.push(`Riga ${i + 1}: costo non valido alla colonna ${j} (${values[j]})`);
                costi.push(0);
            } else {
                costi.push(parsed);
            }
        }
        
        data.push({
            provincia: provincia,
            sigla: sigla,
            regione: regione,
            costi: costi
        });
    }
    
    if (errors.length > 0) {
        console.log('CSV Parsing Errors:', errors);
        // Show errors in notification but continue with valid data
        showNotification(`Attenzione: ${errors.length} errori nel CSV. Caricate ${data.length} province valide.`, 'warning');
    }
    
    if (data.length === 0) {
        throw new Error('Nessun dato valido trovato nel file CSV');
    }
    
    return data;
}

function updateTariffeProvinciali(csvData) {
    // Clear existing rates and replace with CSV data
    tariffeProvinciali = {};
    
    csvData.forEach(row => {
        if (row.provincia && row.costi) {
            tariffeProvinciali[row.provincia] = {
                nome: row.provincia,
                sigla: row.sigla || '',
                regione: row.regione || '',
                costi: row.costi
            };
        }
    });
    
    saveRates();
}

function downloadCurrentRates() {
    // Create CSV content
    let csvContent = 'Provincia,Sigla,Regione,Costo_0_25,Costo_26_50,Costo_51_75,Costo_76_100,Costo_oltre_100\n';
    
    Object.keys(tariffeProvinciali).sort().forEach(provincia => {
        const dati = tariffeProvinciali[provincia];
        if (dati) {
            csvContent += `${provincia},${dati.sigla || ''},${dati.regione},${dati.costi[0]},${dati.costi[1]},${dati.costi[2]},${dati.costi[3]},${dati.costi[4]}\n`;
        }
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tariffe_provinciali.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('CSV scaricato con successo!', 'success');
}

function downloadTemplate() {
    // Create template CSV content with more examples
    const templateContent = 'Provincia,Sigla,Regione,Costo_0_25,Costo_26_50,Costo_51_75,Costo_76_100,Costo_oltre_100\n';
    templateContent += 'MI,MI,Lombardia,6.996,9.515,12.342,14.586,14.586\n';
    templateContent += 'RM,RM,Lazio,8.206,10.791,13.376,15.972,15.972\n';
    templateContent += 'NA,NA,Campania,10.373,12.914,15.444,17.985,17.985\n';
    templateContent += 'TO,TO,Piemonte,6.303,8.822,11.605,13.893,13.893\n';
    templateContent += 'GE,GE,Liguria,13.963,17.989,22.301,25.997,25.997\n';
    templateContent += 'BO,BO,Emilia-Romagna,8.206,10.791,13.376,15.972,15.972\n';
    templateContent += 'FI,FI,Toscana,8.206,10.791,13.376,15.972,15.972\n';
    templateContent += 'VE,VE,Veneto,7.37,10.703,14.311,17.402,17.402\n';
    templateContent += 'BA,BA,Puglia,10.373,12.914,15.444,17.985,17.985\n';
    templateContent += 'CA,CA,Sardegna,11.473,17.975,24.477,30.979,30.979\n';
    templateContent += 'PA,PA,Sicilia,10.373,12.914,15.444,17.985,17.985\n';
    templateContent += 'AN,AN,Marche,20.889,20.889,20.889,20.889,20.889\n';
    templateContent += 'AQ,AQ,Abruzzo,8.206,10.791,13.376,15.972,15.972\n';
    templateContent += 'TN,TN,Trentino-Alto Adige,9.361,12.045,14.729,17.413,17.413\n';
    templateContent += 'PZ,PZ,Basilicata,11.473,17.975,24.477,30.979,30.979\n';
    
    // Create download link
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_tariffe.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Template CSV scaricato con successo!', 'success');
}

// User Management Functions
function loadUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    Object.keys(users).forEach(email => {
        const user = users[email];
        if (user) {
            const row = document.createElement('tr');
            row.className = 'editable-rate';
            row.innerHTML = `
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${email}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${user.name}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${user.role}</td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ${user.mustChangePassword ? '<span class="text-red-600">No</span>' : '<span class="text-green-600">Sì</span>'}
                </td>
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button onclick="resetUserPassword('${email}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Reset Password">
                        <i class="fas fa-key"></i>
                    </button>
                    <button onclick="deleteUser('${email}')" class="text-red-600 hover:text-red-800 ${user.role === 'admin' ? 'hidden' : ''}" title="Elimina Utente">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
    });
}

function addNewUser() {
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');
    
    content.innerHTML = `
        <form id="newUserForm" class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Aggiungi Nuovo Utente</h4>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" id="newUserEmail" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="email@example.com">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700">Nome</label>
                    <input type="text" id="newUserName" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Nome Cognome">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Ruolo</label>
                    <select id="newUserRole" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="user">Utente</option>
                        <option value="admin">Amministratore</option>
                    </select>
                </div>
            </div>
            
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p class="text-sm text-yellow-800">
                    <i class="fas fa-info-circle mr-2"></i>
                    L'utente avrà password temporanea "123456" e dovrà cambiarla al primo accesso.
                </p>
            </div>
            
            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onclick="closeRateModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition">
                    Annulla
                </button>
                <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                    <i class="fas fa-plus mr-2"></i> Aggiungi Utente
                </button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    
    document.getElementById('newUserForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveNewUser();
    });
}

function saveNewUser() {
    const email = document.getElementById('newUserEmail').value;
    const name = document.getElementById('newUserName').value;
    const role = document.getElementById('newUserRole').value;
    
    if (users[email]) {
        showNotification('Utente con questa email già esistente!', 'error');
        return;
    }
    
    users[email] = {
        email: email,
        password: '123456',
        role: role,
        name: name,
        mustChangePassword: true
    };
    
    closeRateModal();
    loadUsersTable();
    showNotification(`Utente ${email} aggiunto con successo!`, 'success');
}

function deleteUser(email) {
    if (users[email].role === 'admin') {
        showNotification('Non puoi eliminare un amministratore!', 'error');
        return;
    }
    
    if (confirm(`Sei sicuro di voler eliminare l'utente ${email}?`)) {
        delete users[email];
        loadUsersTable();
        showNotification(`Utente ${email} eliminato con successo!`, 'success');
    }
}

function resetUserPassword(email) {
    if (confirm(`Sei sicuro di voler resettare la password di ${email}? L'utente dovrà cambiarla al prossimo accesso.`)) {
        users[email].password = '123456';
        users[email].mustChangePassword = true;
        loadUsersTable();
        showNotification(`Password di ${email} resettata con successo!`, 'success');
    }
}

// Password Change Functions
function showChangePasswordModal() {
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');
    
    content.innerHTML = `
        <form id="changePasswordForm" class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Cambia Password</h4>
                <p class="text-sm text-gray-600 mt-2">Devi cambiare la password al primo accesso.</p>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700">Nuova Password</label>
                <input type="password" id="newPassword" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Nuova password">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700">Conferma Password</label>
                <input type="password" id="confirmPassword" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Conferma password">
            </div>
            
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-sm text-blue-800 font-semibold mb-2">Requisiti password:</p>
                <ul class="text-sm text-blue-700 list-disc list-inside">
                    <li>Minimo 8 caratteri</li>
                    <li>Almeno una lettera maiuscola</li>
                    <li>Almeno una lettera minuscola</li>
                    <li>Almeno un numero</li>
                </ul>
            </div>
            
            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-save mr-2"></i> Cambia Password
                </button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    
    document.getElementById('changePasswordForm').addEventListener('submit', function(e) {
        e.preventDefault();
        changePassword();
    });
}

function validatePassword(password) {
    // Minimo 8 caratteri
    if (password.length < 8) {
        return { valid: false, message: 'La password deve avere almeno 8 caratteri' };
    }
    
    // Almeno una lettera maiuscola
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'La password deve contenere almeno una lettera maiuscola' };
    }
    
    // Almeno una lettera minuscola
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'La password deve contenere almeno una lettera minuscola' };
    }
    
    // Almeno un numero
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'La password deve contenere almeno un numero' };
    }
    
    return { valid: true };
}

function changePassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Verifica che le password corrispondano
    if (newPassword !== confirmPassword) {
        showNotification('Le password non corrispondono!', 'error');
        return;
    }
    
    // Valida la password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
        showNotification(validation.message, 'error');
        return;
    }
    
    // Aggiorna la password
    currentUser.password = newPassword;
    currentUser.mustChangePassword = false;
    users[currentUser.email] = currentUser;
    localStorage.setItem('loggedInUser', JSON.stringify(currentUser));
    
    closeRateModal();
    showSection('calculator');
    showNotification('Password cambiata con successo!', 'success');
}

// Saved Calculations Functions
function saveCalculation() {
    if (!currentCalculation) {
        showNotification('Nessun calcolo da salvare', 'error');
        return;
    }
    
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');
    
    content.innerHTML = `
        <form id="saveCalculationForm" class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Salva Calcolo</h4>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700">Nome del calcolo</label>
                <input type="text" id="calculationName" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="es. Spedizione Milano 50kg">
            </div>
            
            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onclick="closeRateModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition">
                    Annulla
                </button>
                <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                    <i class="fas fa-save mr-2"></i> Salva
                </button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    
    document.getElementById('saveCalculationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveCalculationWithName();
    });
}

function saveCalculationWithName() {
    const name = document.getElementById('calculationName').value;
    
    // Get saved calculations from localStorage
    const savedCalculations = JSON.parse(localStorage.getItem('savedCalculations') || '[]');
    
    // Create new calculation entry
    const newCalculation = {
        id: Date.now().toString(),
        name: name,
        email: currentUser.email,
        date: new Date().toISOString(),
        data: currentCalculation
    };
    
    // Add to saved calculations
    savedCalculations.push(newCalculation);
    
    // Save to localStorage
    localStorage.setItem('savedCalculations', JSON.stringify(savedCalculations));
    
    closeRateModal();
    showNotification('Calcolo salvato con successo!', 'success');
}

function loadSavedCalculations() {
    const savedCalculations = JSON.parse(localStorage.getItem('savedCalculations') || '[]');
    const userCalculations = savedCalculations.filter(calc => calc.email === currentUser.email);
    
    const listDiv = document.getElementById('savedCalculationsList');
    const noSavedDiv = document.getElementById('noSavedCalculations');
    
    if (userCalculations.length === 0) {
        listDiv.innerHTML = '';
        noSavedDiv.classList.remove('hidden');
        return;
    }
    
    noSavedDiv.classList.add('hidden');
    listDiv.innerHTML = '';
    
    userCalculations.forEach(calc => {
        const date = new Date(calc.date).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const card = document.createElement('div');
        card.className = 'bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10';
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h4 class="text-lg font-semibold text-white mb-2">${calc.name}</h4>
                    <div class="text-sm text-white/60 space-y-1">
                        <p><i class="fas fa-map-marker-alt mr-2"></i>${calc.data.result.provincia}</p>
                        <p><i class="fas fa-weight-hanging mr-2"></i>${calc.data.result.peso} kg</p>
                        <p><i class="fas fa-calendar mr-2"></i>${date}</p>
                        <p class="mt-2 text-lg font-bold text-green-400">Totale: € ${Math.round(calc.data.result.totale)}</p>
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button onclick="loadCalculation('${calc.id}')" class="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition" title="Carica Calcolo">
                        <i class="fas fa-upload"></i>
                    </button>
                    <button onclick="deleteSavedCalculation('${calc.id}')" class="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition" title="Elimina">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        listDiv.appendChild(card);
    });
}

function loadCalculation(id) {
    const savedCalculations = JSON.parse(localStorage.getItem('savedCalculations') || '[]');
    const calculation = savedCalculations.find(calc => calc.id === id);
    
    if (!calculation) {
        showNotification('Calcolo non trovato', 'error');
        return;
    }
    
    const data = calculation.data;
    
    // Load parameters into form
    document.getElementById('provincia').value = data.provincia;
    document.getElementById('peso').value = data.peso;
    document.getElementById('sponda').value = data.sponda;
    document.getElementById('batteria').value = data.batteria;
    document.getElementById('fascio').value = data.fascio;
    document.getElementById('palletSfuso').value = data.palletSfuso;
    document.getElementById('numeroRighe').value = data.numeroRighe;
    
    // Set current calculation
    currentCalculation = data;
    
    // Display the result
    displayCalculationResult(data.result);
    
    // Show action buttons
    document.getElementById('actionButtons').classList.remove('hidden');
    
    // Switch to calculator section
    showSection('calculator');
    
    showNotification('Calcolo caricato con successo!', 'success');
}

function deleteSavedCalculation(id) {
    if (!confirm('Sei sicuro di voler eliminare questo calcolo?')) {
        return;
    }
    
    const savedCalculations = JSON.parse(localStorage.getItem('savedCalculations') || '[]');
    const filteredCalculations = savedCalculations.filter(calc => calc.id !== id);
    
    localStorage.setItem('savedCalculations', JSON.stringify(filteredCalculations));
    
    loadSavedCalculations();
    showNotification('Calcolo eliminato con successo!', 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 fade-in ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                type === 'warning' ? 'fa-exclamation-triangle' :
                'fa-info-circle'
            } mr-2"></i>
            ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000); // Longer timeout for warnings
}
