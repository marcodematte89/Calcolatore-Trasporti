// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA8Wjt-sgNp2kpQYNWmIihy_3E4xYjIoco",
    authDomain: "wattyesaving.firebaseapp.com",
    projectId: "wattyesaving",
    storageBucket: "wattyesaving.firebasestorage.app",
    messagingSenderId: "101400604075",
    appId: "1:101400604075:web:6d1434a8866ff48fb376ee"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Application State
let currentUser = null;
let tariffeProvinciali = {};
let regoleCalcolo = {};
let currentCalculation = null;

// Load data from localStorage/Firestore on page load
async function loadAllData() {
    await loadRates();
    await loadRules();
    await loadCarriers();
    await loadClients();
    loadUsers(); // Keep users from localStorage for now
    await loadShipments();
    cleanupOldDDTFiles();
}

// Password hashing utility using Web Crypto API
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Mock user data
const users = {
    'logistica@esaving.eu': {
        email: 'logistica@esaving.eu',
        password: '123456',
        role: 'admin',
        name: 'Amministratore',
        mustChangePassword: true,
        userNumber: 0
    }
};

// Client data structure: codice_cliente -> codice_utente
let clienti = {
    // Example: '1001': 1, '1002': 1, '1003': 2
};

// Carriers data structure with API keys
let vettori = {
    // Example: {
    //   'Bartolini': {
    //     nome: 'Bartolini',
    //     apiKey: 'your_api_key',
    //     apiUrl: 'https://api.brt.it/...',
    //     attivo: true
    //   }
    // }
};

// Shipments data structure
let spedizioni = {
    // Example: {
    //   'SP001': {
    //     id: 'SP001',
    //     nrDDT: 'DDT001',
    //     codiceCliente: '1001',
    //     vettore: 'Bartolini',
    //     dataPreparazioneMerce: '2024-01-15',
    //     stato: 'In transito',
    //     ultimoMagazzino: 'Milano',
    //     dataConsegna: '2024-01-16',
    //     linkTracking: 'https://...',
    //     note: ''
    //   }
    // }
};

// Tracking Section Functions
function loadTrackingSection() {
    if (!currentUser) {
        showNotification('Devi effettuare il login per accedere al tracking', 'error');
        showSection('login');
        return;
    }

    const adminView = document.getElementById('adminTrackingView');
    const userView = document.getElementById('userTrackingView');

    if (currentUser.role === 'admin') {
        adminView.classList.remove('hidden');
        userView.classList.add('hidden');
        loadAllShipments();
    } else {
        adminView.classList.add('hidden');
        userView.classList.remove('hidden');
        loadUserShipments();
    }
}

function loadAllShipments() {
    const tbody = document.getElementById('shipmentsTableBody');
    tbody.innerHTML = '';

    const shipmentIds = Object.keys(spedizioni);

    // Filter out shipments delivered more than 10 days ago
    const activeShipments = shipmentIds.filter(id => {
        const shipment = spedizioni[id];
        return !isDeliveredMoreThan10Days(shipment);
    });

    // Populate carrier filter
    populateCarrierFilter('filterVettore');

    if (activeShipments.length === 0) {
        document.getElementById('noShipments').classList.remove('hidden');
        return;
    }

    document.getElementById('noShipments').classList.add('hidden');

    // Sort shipments by DDT descending (largest first)
    activeShipments.sort((a, b) => {
        const ddtA = parseInt(spedizioni[a].nrDDT) || 0;
        const ddtB = parseInt(spedizioni[b].nrDDT) || 0;
        return ddtB - ddtA;
    });

    activeShipments.forEach((id, index) => {
        const shipment = spedizioni[id];
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-100';
        row.innerHTML = `
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.nrDDT}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.codiceCliente}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.vettore}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.dataPreparazioneMerce}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.stato}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.ultimoMagazzino}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.dataConsegna || '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.note || '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ${shipment.linkTracking ? `
                    <a href="${shipment.linkTracking}" target="_blank" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-external-link-alt"></i></a>
                    <button onclick="shareTracking('${shipment.linkTracking}')" class="text-purple-600 hover:text-purple-800" title="Condividi tracking"><i class="fas fa-share-alt"></i></button>
                ` : '-'}
            </td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ${shipment.ddtFile ? `<button onclick="viewDDT('${shipment.id}')" class="text-green-600 hover:text-green-800 mr-2" title="Visualizza DDT"><i class="fas fa-file-pdf"></i></button>` : ''}
                <button onclick="editShipment('${shipment.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteShipment('${shipment.id}')" class="text-red-600 hover:text-red-800" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadUserShipments() {
    const tbody = document.getElementById('userShipmentsTableBody');
    tbody.innerHTML = '';

    const userNumber = currentUser.userNumber;
    const shipmentIds = Object.keys(spedizioni);

    // Filter shipments by user's clients and exclude delivered >10 days
    const userShipments = shipmentIds.filter(id => {
        const shipment = spedizioni[id];
        const clientUserNumber = clienti[shipment.codiceCliente];
        const isDeliveredOld = isDeliveredMoreThan10Days(shipment);
        return clientUserNumber === userNumber && !isDeliveredOld;
    });

    // Populate carrier filter
    populateCarrierFilter('filterVettoreUser');

    if (userShipments.length === 0) {
        document.getElementById('noUserShipments').classList.remove('hidden');
        return;
    }

    document.getElementById('noUserShipments').classList.add('hidden');

    // Sort shipments by DDT descending (largest first)
    userShipments.sort((a, b) => {
        const ddtA = parseInt(spedizioni[a].nrDDT) || 0;
        const ddtB = parseInt(spedizioni[b].nrDDT) || 0;
        return ddtB - ddtA;
    });

    userShipments.forEach((id, index) => {
        const shipment = spedizioni[id];
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-100';
        row.innerHTML = `
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.nrDDT}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.codiceCliente}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.vettore}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.dataPreparazioneMerce}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.stato}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.ultimoMagazzino}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.dataConsegna || '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.note || '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ${shipment.linkTracking ? `
                    <a href="${shipment.linkTracking}" target="_blank" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-external-link-alt"></i></a>
                    <button onclick="shareTracking('${shipment.linkTracking}')" class="text-purple-600 hover:text-purple-800" title="Condividi tracking"><i class="fas fa-share-alt"></i></button>
                ` : '-'}
            </td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ${shipment.ddtFile ? `<button onclick="viewDDT('${shipment.id}')" class="text-green-600 hover:text-green-800" title="Visualizza DDT"><i class="fas fa-file-pdf"></i></button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function isDeliveredMoreThan10Days(shipment) {
    if (shipment.stato !== 'Consegnato' || !shipment.dataConsegna) {
        return false;
    }

    const deliveryDate = new Date(shipment.dataConsegna);
    const today = new Date();
    const diffTime = Math.abs(today - deliveryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 10;
}

function loadDeliveredShipments() {
    const tbody = document.getElementById('deliveredShipmentsTableBody');
    tbody.innerHTML = '';

    const shipmentIds = Object.keys(spedizioni);

    // Filter shipments delivered more than 10 days ago
    const deliveredShipments = shipmentIds.filter(id => {
        const shipment = spedizioni[id];
        return isDeliveredMoreThan10Days(shipment);
    });

    // Populate carrier filter
    populateCarrierFilter('filterVettoreDelivered');

    if (deliveredShipments.length === 0) {
        document.getElementById('noDeliveredShipments').classList.remove('hidden');
        return;
    }

    document.getElementById('noDeliveredShipments').classList.add('hidden');

    // Sort shipments by DDT descending (largest first)
    deliveredShipments.sort((a, b) => {
        const ddtA = parseInt(spedizioni[a].nrDDT) || 0;
        const ddtB = parseInt(spedizioni[b].nrDDT) || 0;
        return ddtB - ddtA;
    });

    deliveredShipments.forEach((id, index) => {
        const shipment = spedizioni[id];
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-100';
        row.innerHTML = `
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.nrDDT}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.codiceCliente}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.vettore}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.dataPreparazioneMerce}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.dataConsegna}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.note || '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ${shipment.linkTracking ? `
                    <a href="${shipment.linkTracking}" target="_blank" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-external-link-alt"></i></a>
                    <button onclick="shareTracking('${shipment.linkTracking}')" class="text-purple-600 hover:text-purple-800" title="Condividi tracking"><i class="fas fa-share-alt"></i></button>
                ` : '-'}
            </td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider admin-only">
                <button onclick="editShipment('${shipment.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteShipment('${shipment.id}')" class="text-red-600 hover:text-red-800" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterDeliveredShipments() {
    const searchTerm = document.getElementById('searchDeliveredShipments').value.toLowerCase();
    const vettoreFilter = document.getElementById('filterVettoreDelivered').value;
    const dataDaFilter = document.getElementById('filterDataDaDelivered').value;
    const dataAFilter = document.getElementById('filterDataADelivered').value;

    const tbody = document.getElementById('deliveredShipmentsTableBody');
    tbody.innerHTML = '';

    const shipmentIds = Object.keys(spedizioni);

    // Filter shipments delivered more than 10 days ago
    const deliveredShipments = shipmentIds.filter(id => {
        const shipment = spedizioni[id];
        return isDeliveredMoreThan10Days(shipment);
    });

    // Apply filters
    const filteredShipments = deliveredShipments.filter(id => {
        const shipment = spedizioni[id];

        // Search filter
        const matchesSearch = !searchTerm ||
            shipment.nrDDT.toLowerCase().includes(searchTerm) ||
            shipment.codiceCliente.toLowerCase().includes(searchTerm) ||
            shipment.vettore.toLowerCase().includes(searchTerm);

        // Carrier filter
        const matchesVettore = !vettoreFilter || shipment.vettore === vettoreFilter;

        // Date filter (from)
        let matchesDataDa = true;
        if (dataDaFilter && shipment.dataConsegna) {
            matchesDataDa = new Date(shipment.dataConsegna) >= new Date(dataDaFilter);
        }

        // Date filter (to)
        let matchesDataA = true;
        if (dataAFilter && shipment.dataConsegna) {
            matchesDataA = new Date(shipment.dataConsegna) <= new Date(dataAFilter);
        }

        return matchesSearch && matchesVettore && matchesDataDa && matchesDataA;
    });

    if (filteredShipments.length === 0) {
        document.getElementById('noDeliveredShipments').classList.remove('hidden');
        return;
    }

    document.getElementById('noDeliveredShipments').classList.add('hidden');

    // Sort shipments by DDT descending (largest first)
    filteredShipments.sort((a, b) => {
        const ddtA = parseInt(spedizioni[a].nrDDT) || 0;
        const ddtB = parseInt(spedizioni[b].nrDDT) || 0;
        return ddtB - ddtA;
    });

    filteredShipments.forEach((id, index) => {
        const shipment = spedizioni[id];
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-100';
        row.innerHTML = `
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.nrDDT}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.codiceCliente}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.vettore}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.dataPreparazioneMerce}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.dataConsegna}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.note || '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ${shipment.linkTracking ? `
                    <a href="${shipment.linkTracking}" target="_blank" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-external-link-alt"></i></a>
                    <button onclick="shareTracking('${shipment.linkTracking}')" class="text-purple-600 hover:text-purple-800" title="Condividi tracking"><i class="fas fa-share-alt"></i></button>
                ` : '-'}
            </td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider admin-only">
                <button onclick="editShipment('${shipment.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteShipment('${shipment.id}')" class="text-red-600 hover:text-red-800" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function populateCarrierFilter(filterId) {
    const filter = document.getElementById(filterId);
    if (!filter) return;

    // Get unique carriers from shipments
    const uniqueCarriers = [...new Set(Object.values(spedizioni).map(s => s.vettore).filter(v => v))];

    // Save current selection
    const currentValue = filter.value;

    // Clear options except first
    filter.innerHTML = '<option value="">Tutti</option>';

    // Add carrier options
    uniqueCarriers.forEach(carrier => {
        const option = document.createElement('option');
        option.value = carrier;
        option.textContent = carrier;
        filter.appendChild(option);
    });

    // Restore selection if still valid
    if (uniqueCarriers.includes(currentValue)) {
        filter.value = currentValue;
    }
}

function filterShipments() {
    const searchTerm = document.getElementById('searchShipments').value.toLowerCase();
    const statoFilter = document.getElementById('filterStato').value;
    const vettoreFilter = document.getElementById('filterVettore').value;
    const dataDaFilter = document.getElementById('filterDataDa').value;

    const tbody = document.getElementById('shipmentsTableBody');
    tbody.innerHTML = '';

    const shipmentIds = Object.keys(spedizioni);

    // Filter out shipments delivered more than 10 days ago
    const activeShipments = shipmentIds.filter(id => {
        const shipment = spedizioni[id];
        return !isDeliveredMoreThan10Days(shipment);
    });

    // Apply filters
    const filteredShipments = activeShipments.filter(id => {
        const shipment = spedizioni[id];

        // Search filter
        const matchesSearch = !searchTerm ||
            shipment.nrDDT.toLowerCase().includes(searchTerm) ||
            shipment.codiceCliente.toLowerCase().includes(searchTerm) ||
            shipment.vettore.toLowerCase().includes(searchTerm);

        // Status filter
        const matchesStato = !statoFilter || shipment.stato === statoFilter;

        // Carrier filter
        const matchesVettore = !vettoreFilter || shipment.vettore === vettoreFilter;

        // Date filter
        let matchesData = true;
        if (dataDaFilter && shipment.dataPreparazioneMerce) {
            matchesData = new Date(shipment.dataPreparazioneMerce) >= new Date(dataDaFilter);
        }

        return matchesSearch && matchesStato && matchesVettore && matchesData;
    });

    if (filteredShipments.length === 0) {
        document.getElementById('noShipments').classList.remove('hidden');
        return;
    }

    document.getElementById('noShipments').classList.add('hidden');

    // Sort shipments by DDT descending (largest first)
    filteredShipments.sort((a, b) => {
        const ddtA = parseInt(spedizioni[a].nrDDT) || 0;
        const ddtB = parseInt(spedizioni[b].nrDDT) || 0;
        return ddtB - ddtA;
    });

    filteredShipments.forEach((id, index) => {
        const shipment = spedizioni[id];
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-100';
        row.innerHTML = `
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.nrDDT}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.codiceCliente}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.vettore}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.dataPreparazioneMerce}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.stato}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.ultimoMagazzino}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.dataConsegna || '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.note || '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ${shipment.linkTracking ? `
                    <a href="${shipment.linkTracking}" target="_blank" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-external-link-alt"></i></a>
                    <button onclick="shareTracking('${shipment.linkTracking}')" class="text-purple-600 hover:text-purple-800" title="Condividi tracking"><i class="fas fa-share-alt"></i></button>
                ` : '-'}
            </td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onclick="editShipment('${shipment.id}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteShipment('${shipment.id}')" class="text-red-600 hover:text-red-800" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterUserShipments() {
    const searchTerm = document.getElementById('searchShipmentsUser').value.toLowerCase();
    const statoFilter = document.getElementById('filterStatoUser').value;
    const vettoreFilter = document.getElementById('filterVettoreUser').value;
    const dataDaFilter = document.getElementById('filterDataDaUser').value;

    const tbody = document.getElementById('userShipmentsTableBody');
    tbody.innerHTML = '';

    const userNumber = currentUser.userNumber;
    const shipmentIds = Object.keys(spedizioni);

    // Filter shipments by user's clients and exclude delivered >10 days
    const userShipments = shipmentIds.filter(id => {
        const shipment = spedizioni[id];
        const clientUserNumber = clienti[shipment.codiceCliente];
        const isDeliveredOld = isDeliveredMoreThan10Days(shipment);
        return clientUserNumber === userNumber && !isDeliveredOld;
    });

    // Apply filters
    const filteredShipments = userShipments.filter(id => {
        const shipment = spedizioni[id];

        // Search filter
        const matchesSearch = !searchTerm ||
            shipment.nrDDT.toLowerCase().includes(searchTerm) ||
            shipment.codiceCliente.toLowerCase().includes(searchTerm) ||
            shipment.vettore.toLowerCase().includes(searchTerm);

        // Status filter
        const matchesStato = !statoFilter || shipment.stato === statoFilter;

        // Carrier filter
        const matchesVettore = !vettoreFilter || shipment.vettore === vettoreFilter;

        // Date filter
        let matchesData = true;
        if (dataDaFilter && shipment.dataPreparazioneMerce) {
            matchesData = new Date(shipment.dataPreparazioneMerce) >= new Date(dataDaFilter);
        }

        return matchesSearch && matchesStato && matchesVettore && matchesData;
    });

    if (filteredShipments.length === 0) {
        document.getElementById('noUserShipments').classList.remove('hidden');
        return;
    }

    document.getElementById('noUserShipments').classList.add('hidden');

    // Sort shipments by DDT descending (largest first)
    filteredShipments.sort((a, b) => {
        const ddtA = parseInt(spedizioni[a].nrDDT) || 0;
        const ddtB = parseInt(spedizioni[b].nrDDT) || 0;
        return ddtB - ddtA;
    });

    filteredShipments.forEach((id, index) => {
        const shipment = spedizioni[id];
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-100';
        row.innerHTML = `
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.nrDDT}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.codiceCliente}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.vettore}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.dataPreparazioneMerce}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.stato}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.ultimoMagazzino}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${shipment.dataConsegna || '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hide-mobile">${shipment.note || '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ${shipment.linkTracking ? `
                    <a href="${shipment.linkTracking}" target="_blank" class="text-blue-600 hover:text-blue-800 mr-2"><i class="fas fa-external-link-alt"></i></a>
                    <button onclick="shareTracking('${shipment.linkTracking}')" class="text-purple-600 hover:text-purple-800" title="Condividi tracking"><i class="fas fa-share-alt"></i></button>
                ` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function addNewShipment() {
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');

    // Get available carriers
    const carrierOptions = Object.keys(vettori).map(nome =>
        `<option value="${nome}">${nome}</option>`
    ).join('');

    content.innerHTML = `
        <form id="newShipmentForm" class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Aggiungi Nuova Spedizione</h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Codice Cliente</label>
                    <input type="text" id="newShipmentCodiceCliente" required class="w-full px-4 py-2 border border-gray-300 rounded-lg uppercase" placeholder="Codice cliente (es. 1001)" style="text-transform: uppercase;">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nr. DDT</label>
                    <input type="text" id="newShipmentNrDDT" required class="w-full px-4 py-2 border border-gray-300 rounded-lg uppercase" placeholder="Nr. DDT" style="text-transform: uppercase;">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Vettore</label>
                    <select id="newShipmentVettore" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="">Seleziona vettore</option>
                        ${carrierOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Data Preparazione Merce</label>
                    <input type="date" id="newShipmentDataPreparazione" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Magazzino</label>
                    <input type="text" id="newShipmentMagazzino" class="w-full px-4 py-2 border border-gray-300 rounded-lg uppercase" placeholder="Magazzino" style="text-transform: uppercase;">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Link Tracking</label>
                    <input type="url" id="newShipmentLinkTracking" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="https://...">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Stato</label>
                    <select id="newShipmentStato" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="Preparato">Preparato</option>
                        <option value="In magazzino">In magazzino</option>
                        <option value="Prenotato">Prenotato</option>
                        <option value="In consegna">In consegna</option>
                        <option value="Consegnato">Consegnato</option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700">Note</label>
                    <textarea id="newShipmentNote" class="w-full px-4 py-2 border border-gray-300 rounded-lg uppercase" rows="3" placeholder="Note aggiuntive" style="text-transform: uppercase;"></textarea>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700">File DDT (PDF)</label>
                    <input type="file" id="newShipmentDDTFile" accept=".pdf" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <p class="text-xs text-gray-500 mt-1">Carica il file PDF del DDT (opzionale)</p>
                </div>
            </div>

            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onclick="closeRateModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition">
                    Annulla
                </button>
                <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                    <i class="fas fa-plus mr-2"></i> Aggiungi Spedizione
                </button>
            </div>
        </form>
    `;

    modal.classList.remove('hidden');

    document.getElementById('newShipmentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveNewShipment();
    });
}

async function saveNewShipment() {
    const codiceCliente = document.getElementById('newShipmentCodiceCliente').value;
    const nrDDT = document.getElementById('newShipmentNrDDT').value;
    const vettore = document.getElementById('newShipmentVettore').value;
    const dataPreparazioneMerce = document.getElementById('newShipmentDataPreparazione').value;
    const magazzino = document.getElementById('newShipmentMagazzino').value;
    const linkTracking = document.getElementById('newShipmentLinkTracking').value;
    const stato = document.getElementById('newShipmentStato').value;
    const note = document.getElementById('newShipmentNote').value;
    const ddtFile = document.getElementById('newShipmentDDTFile').files[0];

    let ddtBase64 = '';
    if (ddtFile) {
        ddtBase64 = await readFileAsBase64(ddtFile);
    }

    // Generate unique shipment ID
    const shipmentId = 'SP' + Date.now().toString().slice(-6);

    spedizioni[shipmentId] = {
        id: shipmentId,
        nrDDT: nrDDT,
        codiceCliente: codiceCliente,
        vettore: vettore,
        dataPreparazioneMerce: dataPreparazioneMerce,
        stato: stato,
        ultimoMagazzino: magazzino,
        dataConsegna: '',
        linkTracking: linkTracking,
        note: note,
        ddtFile: ddtBase64
    };

    saveShipments();
    closeRateModal();
    loadAllShipments();
    showNotification('Spedizione aggiunta con successo!', 'success');
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function editShipment(id) {
    const shipment = spedizioni[id];
    if (!shipment) return;

    // Check if user is admin for delivered shipments >10 days
    if (isDeliveredMoreThan10Days(shipment)) {
        if (!currentUser || currentUser.role !== 'admin') {
            showNotification('Solo gli amministratori possono modificare spedizioni consegnate da più di 10 giorni', 'error');
            return;
        }
    }

    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');

    content.innerHTML = `
        <form id="editShipmentForm" class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Modifica Spedizione ${id}</h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Codice Cliente</label>
                    <input type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100" value="${shipment.codiceCliente}" readonly>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nr. DDT</label>
                    <input type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100" value="${shipment.nrDDT}" readonly>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Vettore</label>
                    <input type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100" value="${shipment.vettore}" readonly>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Data Preparazione Merce</label>
                    <input type="date" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100" value="${shipment.dataPreparazioneMerce}" readonly>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Magazzino</label>
                    <input type="text" id="editShipmentMagazzino" class="w-full px-4 py-2 border border-gray-300 rounded-lg uppercase" value="${shipment.ultimoMagazzino}" style="text-transform: uppercase;">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Data Consegna</label>
                    <input type="date" id="editShipmentDataConsegna" class="w-full px-4 py-2 border border-gray-300 rounded-lg" value="${shipment.dataConsegna || ''}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Stato</label>
                    <select id="editShipmentStato" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="Preparato" ${shipment.stato === 'Preparato' ? 'selected' : ''}>Preparato</option>
                        <option value="In magazzino" ${shipment.stato === 'In magazzino' ? 'selected' : ''}>In magazzino</option>
                        <option value="Prenotato" ${shipment.stato === 'Prenotato' ? 'selected' : ''}>Prenotato</option>
                        <option value="In consegna" ${shipment.stato === 'In consegna' ? 'selected' : ''}>In consegna</option>
                        <option value="Consegnato" ${shipment.stato === 'Consegnato' ? 'selected' : ''}>Consegnato</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Link Tracking</label>
                    <input type="url" id="editShipmentLinkTracking" class="w-full px-4 py-2 border border-gray-300 rounded-lg" value="${shipment.linkTracking || ''}">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700">Note</label>
                    <textarea id="editShipmentNote" class="w-full px-4 py-2 border border-gray-300 rounded-lg uppercase" rows="3" style="text-transform: uppercase;">${shipment.note || ''}</textarea>
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

    document.getElementById('editShipmentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveShipmentEdit(id);
    });
}

function saveShipmentEdit(id) {
    spedizioni[id] = {
        id: id,
        nrDDT: spedizioni[id].nrDDT,
        codiceCliente: spedizioni[id].codiceCliente,
        vettore: spedizioni[id].vettore,
        dataPreparazioneMerce: spedizioni[id].dataPreparazioneMerce,
        stato: document.getElementById('editShipmentStato').value,
        ultimoMagazzino: document.getElementById('editShipmentMagazzino').value,
        dataConsegna: document.getElementById('editShipmentDataConsegna').value,
        linkTracking: document.getElementById('editShipmentLinkTracking').value,
        note: document.getElementById('editShipmentNote').value
    };

    saveShipments();
    closeRateModal();
    loadAllShipments();
    showNotification('Spedizione modificata con successo!', 'success');
}

function deleteShipment(id) {
    const shipment = spedizioni[id];
    if (!shipment) return;

    // Check if user is admin for delivered shipments >10 days
    if (isDeliveredMoreThan10Days(shipment)) {
        if (!currentUser || currentUser.role !== 'admin') {
            showNotification('Solo gli amministratori possono eliminare spedizioni consegnate da più di 10 giorni', 'error');
            return;
        }
    }

    if (confirm(`Sei sicuro di voler eliminare la spedizione ${id}?`)) {
        delete spedizioni[id];
        saveShipments();
        loadAllShipments();
        showNotification('Spedizione eliminata con successo!', 'success');
    }
}

function viewDDT(id) {
    const shipment = spedizioni[id];
    if (!shipment || !shipment.ddtFile) {
        showNotification('File DDT non disponibile', 'error');
        return;
    }

    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');

    content.innerHTML = `
        <div class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">DDT - ${shipment.nrDDT}</h4>
                <p class="text-sm text-gray-600 mt-2">Codice Cliente: ${shipment.codiceCliente}</p>
            </div>

            <div class="w-full h-96 border border-gray-300 rounded-lg overflow-hidden">
                <iframe src="${shipment.ddtFile}" class="w-full h-full" frameborder="0"></iframe>
            </div>

            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onclick="closeRateModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition">
                    Chiudi
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function cleanupOldDDTFiles() {
    let cleanedCount = 0;
    Object.keys(spedizioni).forEach(id => {
        const shipment = spedizioni[id];
        if (shipment.ddtFile && isDeliveredMoreThan10Days(shipment)) {
            delete shipment.ddtFile;
            cleanedCount++;
        }
    });

    if (cleanedCount > 0) {
        saveShipments();
    }
}

function shareTracking(link) {
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');

    content.innerHTML = `
        <div class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Condividi Link Tracking</h4>
                <p class="text-sm text-gray-600 mt-2">Scegli come condividere il link</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <button onclick="shareViaWhatsApp('${link}')" class="flex items-center justify-center space-x-2 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition">
                    <i class="fab fa-whatsapp text-xl"></i>
                    <span>WhatsApp</span>
                </button>
                <button onclick="shareViaEmail('${link}')" class="flex items-center justify-center space-x-2 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition">
                    <i class="fas fa-envelope text-xl"></i>
                    <span>Email</span>
                </button>
                <button onclick="shareViaTelegram('${link}')" class="flex items-center justify-center space-x-2 bg-blue-400 text-white px-4 py-3 rounded-lg hover:bg-blue-500 transition">
                    <i class="fab fa-telegram text-xl"></i>
                    <span>Telegram</span>
                </button>
                <button onclick="copyLink('${link}')" class="flex items-center justify-center space-x-2 bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition">
                    <i class="fas fa-copy text-xl"></i>
                    <span>Copia Link</span>
                </button>
            </div>

            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onclick="closeRateModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition">
                    Chiudi
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function shareViaWhatsApp(link) {
    const text = `Ecco il link di tracking della spedizione: ${link}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
}

function shareViaEmail(link) {
    const subject = 'Tracking Spedizione';
    const body = `Ecco il link di tracking della spedizione: ${link}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
}

function shareViaTelegram(link) {
    const text = `Ecco il link di tracking della spedizione: ${link}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
}

function copyLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Link copiato negli appunti!', 'success');
        closeRateModal();
    }).catch(() => {
        showNotification('Errore nella copia del link', 'error');
    });
}

function uploadClientsCSV() {
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');

    content.innerHTML = `
        <div class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Carica CSV Clienti</h4>
                <p class="text-sm text-gray-600 mt-2">Il file CSV deve avere il formato: codice_cliente,codice_utente</p>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Seleziona file CSV</label>
                <input type="file" id="clientsCSVFile" accept=".csv" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
            </div>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p class="text-sm text-blue-800 font-semibold mb-2">Formato CSV:</p>
                <p class="text-sm text-blue-700">codice_cliente,codice_utente</p>
                <p class="text-sm text-blue-700 mt-1">Esempio: 1001,1</p>
                <p class="text-sm text-blue-700 mt-1">Esempio: 1002,1</p>
                <p class="text-sm text-blue-700 mt-1">Esempio: 1003,2</p>
            </div>

            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onclick="closeRateModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition">
                    Annulla
                </button>
                <button type="button" onclick="processClientsCSV()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-upload mr-2"></i> Carica CSV
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function processClientsCSV() {
    const fileInput = document.getElementById('clientsCSVFile');
    const file = fileInput.files[0];

    if (!file) {
        showNotification('Seleziona un file CSV', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');

        let successCount = 0;
        let errorCount = 0;

        lines.forEach((line, index) => {
            if (index === 0 && line.toLowerCase().includes('codice')) {
                // Skip header if present
                return;
            }

            // Skip empty lines
            if (!line.trim()) {
                return;
            }

            // Detect separator (try ; first, then ,)
            const separator = line.includes(';') ? ';' : ',';
            const parts = line.split(separator);

            if (parts.length >= 2) {
                const codiceCliente = parts[0].trim();
                const codiceUtente = parseInt(parts[1].trim());

                if (codiceCliente && !isNaN(codiceUtente)) {
                    clienti[codiceCliente] = codiceUtente;
                    successCount++;
                } else {
                    errorCount++;
                }
            }
        });

        saveClients();
        closeRateModal();
        loadClientsTable();
        showNotification(`CSV caricato: ${successCount} clienti aggiunti, ${errorCount} errori`, successCount > 0 ? 'success' : 'warning');
    };

    reader.readAsText(file);
}

function loadClientsTable() {
    const tbody = document.getElementById('clientsTableBody');
    tbody.innerHTML = '';

    const clientCodes = Object.keys(clienti);

    if (clientCodes.length === 0) {
        document.getElementById('noClients').classList.remove('hidden');
        return;
    }

    document.getElementById('noClients').classList.add('hidden');

    clientCodes.forEach(codiceCliente => {
        const codiceUtente = clienti[codiceCliente];
        const row = document.createElement('tr');
        row.className = 'editable-rate';
        row.innerHTML = `
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${codiceCliente}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${codiceUtente}</td>
        `;
        tbody.appendChild(row);
    });
}

function loadCarriersTable() {
    const tbody = document.getElementById('carriersTableBody');
    tbody.innerHTML = '';

    const carrierNames = Object.keys(vettori);

    if (carrierNames.length === 0) {
        document.getElementById('noCarriers').classList.remove('hidden');
        return;
    }

    document.getElementById('noCarriers').classList.add('hidden');

    carrierNames.forEach(nome => {
        const carrier = vettori[nome];
        const row = document.createElement('tr');
        row.className = 'editable-rate';
        row.innerHTML = `
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${carrier.nome}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${carrier.apiKey ? '***' + carrier.apiKey.slice(-4) : '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${carrier.apiUrl || '-'}</td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span class="${carrier.attivo ? 'text-green-600' : 'text-red-600'}">${carrier.attivo ? 'Sì' : 'No'}</span>
            </td>
            <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onclick="editCarrier('${nome}')" class="text-blue-600 hover:text-blue-800 mr-2" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteCarrier('${nome}')" class="text-red-600 hover:text-red-800" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function addNewCarrier() {
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');

    content.innerHTML = `
        <form id="newCarrierForm" class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Aggiungi Nuovo Vettore</h4>
            </div>

            <div class="grid grid-cols-1 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nome Vettore</label>
                    <input type="text" id="newCarrierNome" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="es. Bartolini">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">API Key</label>
                    <input type="text" id="newCarrierApiKey" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Chiave API (opzionale)">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">API URL</label>
                    <input type="url" id="newCarrierApiUrl" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="URL API (opzionale)">
                </div>
                <div>
                    <label class="flex items-center">
                        <input type="checkbox" id="newCarrierAttivo" checked class="mr-2">
                        <span class="text-sm font-medium text-gray-700">Attivo</span>
                    </label>
                </div>
            </div>

            <div class="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onclick="closeRateModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition">
                    Annulla
                </button>
                <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                    <i class="fas fa-plus mr-2"></i> Aggiungi Vettore
                </button>
            </div>
        </form>
    `;

    modal.classList.remove('hidden');

    document.getElementById('newCarrierForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveNewCarrier();
    });
}

function saveNewCarrier() {
    const nome = document.getElementById('newCarrierNome').value;
    const apiKey = document.getElementById('newCarrierApiKey').value;
    const apiUrl = document.getElementById('newCarrierApiUrl').value;
    const attivo = document.getElementById('newCarrierAttivo').checked;

    vettori[nome] = {
        nome: nome,
        apiKey: apiKey,
        apiUrl: apiUrl,
        attivo: attivo
    };

    saveCarriers();
    closeRateModal();
    loadCarriersTable();
    showNotification('Vettore aggiunto con successo!', 'success');
}

function editCarrier(nome) {
    const carrier = vettori[nome];
    if (!carrier) return;

    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');

    content.innerHTML = `
        <form id="editCarrierForm" class="space-y-4">
            <div class="mb-4">
                <h4 class="text-lg font-semibold text-gray-800">Modifica Vettore ${nome}</h4>
            </div>

            <div class="grid grid-cols-1 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nome Vettore</label>
                    <input type="text" id="editCarrierNome" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" value="${carrier.nome}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">API Key</label>
                    <input type="text" id="editCarrierApiKey" class="w-full px-4 py-2 border border-gray-300 rounded-lg" value="${carrier.apiKey || ''}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">API URL</label>
                    <input type="url" id="editCarrierApiUrl" class="w-full px-4 py-2 border border-gray-300 rounded-lg" value="${carrier.apiUrl || ''}">
                </div>
                <div>
                    <label class="flex items-center">
                        <input type="checkbox" id="editCarrierAttivo" ${carrier.attivo ? 'checked' : ''} class="mr-2">
                        <span class="text-sm font-medium text-gray-700">Attivo</span>
                    </label>
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

    document.getElementById('editCarrierForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveCarrierEdit(nome);
    });
}

function saveCarrierEdit(oldNome) {
    const nome = document.getElementById('editCarrierNome').value;
    const apiKey = document.getElementById('editCarrierApiKey').value;
    const apiUrl = document.getElementById('editCarrierApiUrl').value;
    const attivo = document.getElementById('editCarrierAttivo').checked;

    // Remove old entry if name changed
    if (oldNome !== nome) {
        delete vettori[oldNome];
    }

    vettori[nome] = {
        nome: nome,
        apiKey: apiKey,
        apiUrl: apiUrl,
        attivo: attivo
    };

    saveCarriers();
    closeRateModal();
    loadCarriersTable();
    showNotification('Vettore modificato con successo!', 'success');
}

function deleteCarrier(nome) {
    if (confirm(`Sei sicuro di voler eliminare il vettore ${nome}?`)) {
        delete vettori[nome];
        saveCarriers();
        loadCarriersTable();
        showNotification('Vettore eliminato con successo!', 'success');
    }
}

// Auto-update tracking every 10 minutes if API keys are available
let autoUpdateInterval = null;

function startAutoUpdateTracking() {
    // Clear existing interval if any
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
    }

    // Check if there are active carriers with API keys
    const hasActiveCarriersWithAPI = Object.values(vettori).some(carrier =>
        carrier.attivo && carrier.apiKey && carrier.apiUrl
    );

    if (!hasActiveCarriersWithAPI) {
        console.log('Nessun vettore attivo con API configurata. Aggiornamento automatico disabilitato.');
        return;
    }

    // Update immediately
    updateTrackingFromAPIs();

    // Set interval for every 10 minutes (600000 ms)
    autoUpdateInterval = setInterval(updateTrackingFromAPIs, 600000);
    console.log('Aggiornamento automatico tracking attivato (ogni 10 minuti)');
}

function updateTrackingFromAPIs() {
    console.log('Aggiornamento tracking dalle API...');

    // For each shipment with a carrier that has API configured
    Object.keys(spedizioni).forEach(shipmentId => {
        const shipment = spedizioni[shipmentId];
        const carrier = vettori[shipment.vettore];

        if (carrier && carrier.attivo && carrier.apiKey && carrier.apiUrl) {
            // In a real implementation, this would make an API call to the carrier
            // For now, we'll log that the update would happen
            console.log(`Aggiornamento spedizione ${shipmentId} tramite API ${carrier.nome}`);
            // TODO: Implement actual API calls to carrier endpoints
            // This would require specific implementation for each carrier's API
        }
    });
}

function stopAutoUpdateTracking() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
        console.log('Aggiornamento automatico tracking disabilitato');
    }
}

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
    loadAllData();
    populateProvinces();
    
    // Check if user is already logged in
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (loggedInUser) {
        currentUser = JSON.parse(loggedInUser);
        updateUIForLoggedInUser();
    }
    // Always show calculator as main page
    showSection('calculator');
    
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
    document.getElementById('trackingSection').classList.add('hidden');
    document.getElementById('deliveredSection').classList.add('hidden');

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
    } else if (section === 'tracking') {
        document.getElementById('trackingSection').classList.remove('hidden');
        loadTrackingSection();
    } else if (section === 'delivered') {
        document.getElementById('deliveredSection').classList.remove('hidden');
        loadDeliveredShipments();
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Sign in with Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const firebaseUser = userCredential.user;

        // Get additional user data from Firestore
        const userDoc = await db.collection('users').doc(firebaseUser.email).get();

        if (userDoc.exists) {
            currentUser = {
                email: firebaseUser.email,
                ...userDoc.data()
            };
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
            showNotification('Utente non trovato nel database', 'error');
            await auth.signOut();
        }
    } catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            showNotification('Credenziali non valide', 'error');
        } else {
            showNotification('Errore durante il login: ' + error.message, 'error');
        }
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
        // Show admin-only columns
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    } else {
        // Hide admin-only columns
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    }

    // Show saved calculations link
    document.getElementById('savedCalculationsLink').classList.remove('hidden');
    document.getElementById('savedCalculationsLinkMobile').classList.remove('hidden');

    // Show tracking link
    document.getElementById('trackingLink').classList.remove('hidden');
    document.getElementById('trackingLinkMobile').classList.remove('hidden');

    // Show delivered link
    document.getElementById('deliveredLink').classList.remove('hidden');
    document.getElementById('deliveredLinkMobile').classList.remove('hidden');

    // Hide login link
    document.querySelector('nav a[href="#login"]').classList.add('hidden');
}

async function logout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }

    currentUser = null;
    localStorage.removeItem('loggedInUser');

    // Update UI
    document.getElementById('userMenuBtn').classList.add('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('adminLinkBtn').classList.add('hidden');
    document.getElementById('savedCalculationsLink').classList.add('hidden');
    document.getElementById('savedCalculationsLinkMobile').classList.add('hidden');
    document.getElementById('trackingLink').classList.add('hidden');
    document.getElementById('trackingLinkMobile').classList.add('hidden');
    document.getElementById('deliveredLink').classList.add('hidden');
    document.getElementById('deliveredLinkMobile').classList.add('hidden');
    document.querySelector('nav a[href="#login"]').classList.remove('hidden');

    showSection('login');
    showNotification('Logout effettuato', 'info');
}

// Migration function to move users from localStorage to Firebase
async function migrateUsersToFirebase() {
    const localStorageUsers = JSON.parse(localStorage.getItem('users') || '{}');
    let migratedCount = 0;
    let errors = [];

    for (const email in localStorageUsers) {
        const user = localStorageUsers[email];
        try {
            // Create user in Firebase Auth
            // Note: We need the original password, but localStorage has hashed passwords
            // This is a limitation - users will need to reset passwords
            console.log(`Skipping ${email} - password migration not possible`);
            errors.push(`${email}: Cannot migrate hashed password`);
        } catch (error) {
            console.error(`Error migrating ${email}:`, error);
            errors.push(`${email}: ${error.message}`);
        }
    }

    console.log(`Migration complete. Migrated: ${migratedCount}, Errors: ${errors.length}`);
    return { migratedCount, errors };
}

// Function to create a new user in Firebase (for admin use)
async function createFirebaseUser(email, password, name, role) {
    try {
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);

        // Save additional user data to Firestore
        await db.collection('users').doc(email).set({
            name: name,
            role: role,
            mustChangePassword: true,
            userNumber: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification(`Utente ${email} creato con successo!`, 'success');

        // Sign out after creation
        await auth.signOut();

        return true;
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification('Errore nella creazione utente: ' + error.message, 'error');
        return false;
    }
}

// Helper function to create initial admin user (run from browser console)
// Usage: createInitialAdmin('logistica@esaving.eu', '123456', 'Amministratore')
async function createInitialAdmin(email, password, name) {
    try {
        console.log('Creating initial admin user...');

        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        console.log('Firebase Auth user created');

        // Save additional user data to Firestore
        await db.collection('users').doc(email).set({
            name: name,
            role: 'admin',
            mustChangePassword: true,
            userNumber: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Firestore user data saved');

        // Sign out after creation
        await auth.signOut();
        console.log('Signed out');

        console.log('✅ Admin user created successfully!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('Please login with these credentials and change the password.');

        return true;
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        if (error.code === 'auth/email-already-in-use') {
            console.log('User already exists. You can login with existing credentials.');
        }
        return false;
    }
}

// Show setup admin modal
function showSetupAdminModal() {
    const modal = document.getElementById('rateModal');
    const content = document.getElementById('rateModalContent');

    content.innerHTML = `
        <div class="space-y-4">
            <h3 class="text-xl font-bold text-gray-800">Setup Iniziale Admin</h3>
            <p class="text-sm text-gray-600">Crea l'utente amministratore iniziale per Firebase.</p>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" id="setupEmail" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="logistica@esaving.eu">
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" id="setupPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="123456">
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input type="text" id="setupName" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="Amministratore">
            </div>

            <div class="flex gap-4">
                <button onclick="handleSetupAdmin()" class="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-lg hover:from-green-600 hover:to-teal-600 transition font-semibold">
                    <i class="fas fa-check mr-2"></i> Crea Admin
                </button>
                <button onclick="closeRateModal()" class="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition font-semibold">
                    <i class="fas fa-times mr-2"></i> Annulla
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

// Handle setup admin
async function handleSetupAdmin() {
    const email = document.getElementById('setupEmail').value;
    const password = document.getElementById('setupPassword').value;
    const name = document.getElementById('setupName').value;

    if (!email || !password || !name) {
        showNotification('Compila tutti i campi', 'error');
        return;
    }

    try {
        showNotification('Creazione utente admin in corso...', 'info');

        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);

        // Save additional user data to Firestore
        await db.collection('users').doc(email).set({
            name: name,
            role: 'admin',
            mustChangePassword: true,
            userNumber: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Sign out after creation
        await auth.signOut();

        closeRateModal();
        showNotification('Utente admin creato con successo! Ora puoi fare login.', 'success');

        // Pre-fill login form
        document.getElementById('email').value = email;
        document.getElementById('password').value = password;
    } catch (error) {
        console.error('Error creating admin user:', error);
        if (error.code === 'auth/email-already-in-use') {
            showNotification('Utente già esistente. Fai login con le credenziali esistenti.', 'error');
        } else {
            showNotification('Errore nella creazione: ' + error.message, 'error');
        }
    }
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
    } else if (tabName === 'carriers') {
        loadCarriersTable();
    } else if (tabName === 'clients') {
        loadClientsTable();
    } else if (tabName === 'users') {
        loadUsersTable();
    }
}

async function loadRates() {
    try {
        // Try loading from Firestore first
        const snapshot = await db.collection('rates').get();

        if (!snapshot.empty) {
            tariffeProvinciali = {};
            snapshot.forEach(doc => {
                tariffeProvinciali[doc.id] = doc.data();
            });
            console.log('Rates loaded from Firestore');
        } else {
            // Fallback to localStorage if Firestore is empty
            const savedRates = localStorage.getItem('tariffeProvinciali');
            if (savedRates) {
                tariffeProvinciali = JSON.parse(savedRates);
                // Add sigla field if missing
                Object.keys(tariffeProvinciali).forEach(provincia => {
                    if (!tariffeProvinciali[provincia].sigla) {
                        tariffeProvinciali[provincia].sigla = '';
                    }
                });
                console.log('Rates loaded from localStorage (fallback)');
            } else {
                tariffeProvinciali = {...defaultTariffeProvinciali};
                await saveRates();
            }
        }
    } catch (error) {
        console.error('Error loading rates from Firestore:', error);
        // Fallback to localStorage on error
        const savedRates = localStorage.getItem('tariffeProvinciali');
        if (savedRates) {
            tariffeProvinciali = JSON.parse(savedRates);
            Object.keys(tariffeProvinciali).forEach(provincia => {
                if (!tariffeProvinciali[provincia].sigla) {
                    tariffeProvinciali[provincia].sigla = '';
                }
            });
            console.log('Rates loaded from localStorage (error fallback)');
        } else {
            tariffeProvinciali = {...defaultTariffeProvinciali};
            saveRates();
        }
    }
}

async function saveRates() {
    try {
        // Save to Firestore
        for (const provincia in tariffeProvinciali) {
            await db.collection('rates').doc(provincia).set(tariffeProvinciali[provincia]);
        }
        console.log('Rates saved to Firestore');

        // Also save to localStorage as backup
        localStorage.setItem('tariffeProvinciali', JSON.stringify(tariffeProvinciali));
    } catch (error) {
        console.error('Error saving rates to Firestore:', error);
        // Fallback to localStorage on error
        localStorage.setItem('tariffeProvinciali', JSON.stringify(tariffeProvinciali));
        console.log('Rates saved to localStorage (error fallback)');
    }
}

async function loadRules() {
    try {
        // Try loading from Firestore first
        const snapshot = await db.collection('rules').get();

        if (!snapshot.empty) {
            regoleCalcolo = {};
            snapshot.forEach(doc => {
                regoleCalcolo[doc.id] = doc.data();
            });
            console.log('Rules loaded from Firestore');
        } else {
            // Fallback to localStorage if Firestore is empty
            const savedRules = localStorage.getItem('regoleCalcolo');
            if (savedRules) {
                regoleCalcolo = JSON.parse(savedRules);
                console.log('Rules loaded from localStorage (fallback)');
            } else {
                regoleCalcolo = {...defaultRegoleCalcolo};
                await saveRules();
            }
        }
    } catch (error) {
        console.error('Error loading rules from Firestore:', error);
        // Fallback to localStorage on error
        const savedRules = localStorage.getItem('regoleCalcolo');
        if (savedRules) {
            regoleCalcolo = JSON.parse(savedRules);
            console.log('Rules loaded from localStorage (error fallback)');
        } else {
            regoleCalcolo = {...defaultRegoleCalcolo};
            saveRules();
        }
    }
}

async function saveRules() {
    try {
        // Save to Firestore
        for (const nome in regoleCalcolo) {
            await db.collection('rules').doc(nome).set(regoleCalcolo[nome]);
        }
        console.log('Rules saved to Firestore');

        // Also save to localStorage as backup
        localStorage.setItem('regoleCalcolo', JSON.stringify(regoleCalcolo));
    } catch (error) {
        console.error('Error saving rules to Firestore:', error);
        // Fallback to localStorage on error
        localStorage.setItem('regoleCalcolo', JSON.stringify(regoleCalcolo));
        console.log('Rules saved to localStorage (error fallback)');
    }
}

async function loadCarriers() {
    try {
        // Try loading from Firestore first
        const snapshot = await db.collection('carriers').get();

        if (!snapshot.empty) {
            vettori = {};
            snapshot.forEach(doc => {
                vettori[doc.id] = doc.data();
            });
            console.log('Carriers loaded from Firestore');
        } else {
            // Fallback to localStorage if Firestore is empty
            const savedCarriers = localStorage.getItem('vettori');
            if (savedCarriers) {
                vettori = JSON.parse(savedCarriers);
                console.log('Carriers loaded from localStorage (fallback)');
            }
        }
    } catch (error) {
        console.error('Error loading carriers from Firestore:', error);
        // Fallback to localStorage on error
        const savedCarriers = localStorage.getItem('vettori');
        if (savedCarriers) {
            vettori = JSON.parse(savedCarriers);
            console.log('Carriers loaded from localStorage (error fallback)');
        }
    }
}

async function saveCarriers() {
    try {
        // Save to Firestore
        for (const nome in vettori) {
            await db.collection('carriers').doc(nome).set(vettori[nome]);
        }
        console.log('Carriers saved to Firestore');

        // Also save to localStorage as backup
        localStorage.setItem('vettori', JSON.stringify(vettori));
    } catch (error) {
        console.error('Error saving carriers to Firestore:', error);
        // Fallback to localStorage on error
        localStorage.setItem('vettori', JSON.stringify(vettori));
        console.log('Carriers saved to localStorage (error fallback)');
    }
}

async function loadClients() {
    try {
        // Try loading from Firestore first
        const snapshot = await db.collection('clients').get();

        if (!snapshot.empty) {
            clienti = {};
            snapshot.forEach(doc => {
                clienti[doc.id] = doc.data();
            });
            console.log('Clients loaded from Firestore');
        } else {
            // Fallback to localStorage if Firestore is empty
            const savedClients = localStorage.getItem('clienti');
            if (savedClients) {
                clienti = JSON.parse(savedClients);
                console.log('Clients loaded from localStorage (fallback)');
            }
        }
    } catch (error) {
        console.error('Error loading clients from Firestore:', error);
        // Fallback to localStorage on error
        const savedClients = localStorage.getItem('clienti');
        if (savedClients) {
            clienti = JSON.parse(savedClients);
            console.log('Clients loaded from localStorage (error fallback)');
        }
    }
}

async function saveClients() {
    try {
        // Save to Firestore
        for (const codice in clienti) {
            await db.collection('clients').doc(codice).set(clienti[codice]);
        }
        console.log('Clients saved to Firestore');

        // Also save to localStorage as backup
        localStorage.setItem('clienti', JSON.stringify(clienti));
    } catch (error) {
        console.error('Error saving clients to Firestore:', error);
        // Fallback to localStorage on error
        localStorage.setItem('clienti', JSON.stringify(clienti));
        console.log('Clients saved to localStorage (error fallback)');
    }
}

function loadUsers() {
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
        Object.assign(users, JSON.parse(savedUsers));
    }
}

function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

async function loadShipments() {
    try {
        // Try loading from Firestore first
        const snapshot = await db.collection('shipments').get();

        if (!snapshot.empty) {
            spedizioni = {};
            snapshot.forEach(doc => {
                spedizioni[doc.id] = doc.data();
            });
            console.log('Shipments loaded from Firestore');
        } else {
            // Fallback to localStorage if Firestore is empty
            const savedShipments = localStorage.getItem('spedizioni');
            if (savedShipments) {
                spedizioni = JSON.parse(savedShipments);
                console.log('Shipments loaded from localStorage (fallback)');
            }
        }
    } catch (error) {
        console.error('Error loading shipments from Firestore:', error);
        // Fallback to localStorage on error
        const savedShipments = localStorage.getItem('spedizioni');
        if (savedShipments) {
            spedizioni = JSON.parse(savedShipments);
            console.log('Shipments loaded from localStorage (error fallback)');
        }
    }
}

async function saveShipments() {
    try {
        // Save to Firestore
        for (const id in spedizioni) {
            await db.collection('shipments').doc(id).set(spedizioni[id]);
        }
        console.log('Shipments saved to Firestore');

        // Also save to localStorage as backup
        localStorage.setItem('spedizioni', JSON.stringify(spedizioni));
    } catch (error) {
        console.error('Error saving shipments to Firestore:', error);
        // Fallback to localStorage on error
        localStorage.setItem('spedizioni', JSON.stringify(spedizioni));
        console.log('Shipments saved to localStorage (error fallback)');
    }
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
                <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${user.userNumber || 'N/A'}</td>
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
                <div>
                    <label class="block text-sm font-medium text-gray-700">Numero Utente</label>
                    <input type="number" id="newUserNumber" required class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Numero utente (es. 1, 2, 3...)" min="1">
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

async function saveNewUser() {
    const email = document.getElementById('newUserEmail').value;
    const name = document.getElementById('newUserName').value;
    const role = document.getElementById('newUserRole').value;
    const userNumber = document.getElementById('newUserNumber').value;

    if (users[email]) {
        showNotification('Utente con questa email già esistente!', 'error');
        return;
    }

    // Hash the temporary password
    const hashedPassword = await hashPassword('123456');

    users[email] = {
        email: email,
        password: hashedPassword,
        role: role,
        name: name,
        mustChangePassword: true,
        userNumber: parseInt(userNumber)
    };

    saveUsers();
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
        saveUsers();
        loadUsersTable();
        showNotification(`Utente ${email} eliminato con successo!`, 'success');
    }
}

async function resetUserPassword(email) {
    if (confirm(`Sei sicuro di voler resettare la password di ${email}? L'utente dovrà cambiarla al prossimo accesso.`)) {
        const hashedPassword = await hashPassword('123456');
        users[email].password = hashedPassword;
        users[email].mustChangePassword = true;
        saveUsers();
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

async function changePassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Verifica che le password corrispondono
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

    try {
        // Update password in Firebase Auth
        const user = auth.currentUser;
        await user.updatePassword(newPassword);

        // Update mustChangePassword in Firestore
        await db.collection('users').doc(currentUser.email).update({
            mustChangePassword: false
        });

        // Update local state
        currentUser.mustChangePassword = false;
        localStorage.setItem('loggedInUser', JSON.stringify(currentUser));

        closeRateModal();
        showSection('calculator');
        showNotification('Password cambiata con successo!', 'success');
    } catch (error) {
        console.error('Password change error:', error);
        showNotification('Errore nel cambio password: ' + error.message, 'error');
    }
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
