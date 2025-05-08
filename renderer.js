const { Client, Authenticator } = require('minecraft-launcher-core');
const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const Store = require('electron-store');
const store = new Store();

const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const status = document.getElementById('status');
const progress = document.getElementById('progress');
const launchBtn = document.getElementById('launch-btn');
const loginBtn = document.getElementById('login-btn');
const refreshBtn = document.getElementById('refresh-btn');
const selectDirBtn = document.getElementById('select-dir-btn');
const minecraftDirSpan = document.getElementById('minecraft-dir');
const versionSelect = document.getElementById('version-select');
const versionTypeSelect = document.getElementById('version-type');
const modSelect = document.getElementById('mod-select');
const playerNameInput = document.getElementById('player-name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const themeSelect = document.getElementById('theme');
const memoryInput = document.getElementById('memory');
const fullscreenCheckbox = document.getElementById('fullscreen');
const newsContainer = document.getElementById('news-container');
const openMinecraftBtn = document.getElementById('open-minecraft-btn');
const openFelisBtn = document.getElementById('open-felis-btn');
const checkUpdateBtn = document.getElementById('check-update-btn');

let token = null;

// Load settings
function loadSettings() {
  const savedDir = store.get('minecraftDir', path.join(require('os').homedir(), '.minecraft'));
  minecraftDirSpan.textContent = savedDir;
  playerNameInput.value = store.get('playerName', 'Player');
  emailInput.value = store.get('email', '');
  themeSelect.value = store.get('theme', 'dark');
  document.documentElement.setAttribute('data-theme', themeSelect.value);
  memoryInput.value = store.get('memory', 2048);
  fullscreenCheckbox.checked = window.electronAPI.getStore('fullscreen') || false;
}

// Fetch news
async function fetchNews() {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/FelisTeam/FelisLauncher/main/news.json');
    newsContainer.innerHTML = '';
    response.data.news.forEach(item => {
      const newsItem = document.createElement('div');
      newsItem.className = 'news-item';
      newsItem.innerHTML = `<h3>${item.title}</h3><p>${item.content}</p><small>${item.date}</small>`;
      newsContainer.appendChild(newsItem);
    });
  } catch (error) {
    console.error('Failed to fetch news:', error);
    newsContainer.innerHTML = '<p>Failed to load news.</p>';
  }
}

// Fetch and categorize Minecraft versions
async function fetchVersions() {
  try {
    const response = await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest.json');
    const versions = response.data.versions;
    const categorized = { release: [], snapshot: [], beta: [], alpha: [] };

    versions.forEach(version => {
      if (version.type === 'release') categorized.release.push(version.id);
      else if (version.type === 'snapshot') categorized.snapshot.push(version.id);
      else if (version.id.includes('b')) categorized.beta.push(version.id);
      else if (version.id.includes('a')) categorized.alpha.push(version.id);
    });

    updateVersionSelect(categorized);
  } catch (error) {
    console.error('Failed to fetch versions:', error);
    status.textContent = 'Failed to fetch versions.';
  }
}

function updateVersionSelect(categorized) {
  versionSelect.innerHTML = '';
  const type = versionTypeSelect.value;
  categorized[type].forEach(version => {
    const option = document.createElement('option');
    option.value = version;
    option.textContent = version;
    versionSelect.appendChild(option);
  });
}

// Fetch mod versions (Forge/Fabric)
async function fetchModVersions() {
  try {
    const version = versionSelect.value;
    modSelect.innerHTML = '<option value="vanilla">Vanilla</option>';
    
    // Fetch Forge versions
    const forgeResponse = await axios.get(`https://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json`);
    const forgeVersions = forgeResponse.data.promos;
    for (const key in forgeVersions) {
      if (key.startsWith(version)) {
        const option = document.createElement('option');
        option.value = `forge-${forgeVersions[key]}`;
        option.textContent = `Forge ${forgeVersions[key]}`;
        modSelect.appendChild(option);
      }
    }

    // Fetch Fabric versions (simplified)
    const fabricResponse = await axios.get('https://meta.fabricmc.net/v2/versions/loader/' + version);
    if (fabricResponse.data && fabricResponse.data.length > 0) {
      const latestFabric = fabricResponse.data[0].loader.version;
      const option = document.createElement('option');
      option.value = `fabric-${latestFabric}`;
      option.textContent = `Fabric ${latestFabric}`;
      modSelect.appendChild(option);
    }
  } catch (error) {
    console.error('Failed to fetch mod versions:', error);
  }
}

// Navigation
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(item.dataset.page).classList.add('active');
    if (item.dataset.page === 'home') fetchNews();
  });
});

// Select directory
selectDirBtn.addEventListener('click', async () => {
  const dialog = require('electron').remote.dialog;
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (!result.canceled) {
    const newDir = result.filePaths[0];
    store.set('minecraftDir', newDir);
    minecraftDirSpan.textContent = newDir;
  }
});

// Refresh versions
refreshBtn.addEventListener('click', () => {
  fetchVersions();
  fetchModVersions();
});

// Filter versions by type
versionTypeSelect.addEventListener('change', () => {
  fetchVersions();
  fetchModVersions();
});

// Update mod versions when version changes
versionSelect.addEventListener('change', fetchModVersions);

// Login
loginBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    token = await Authenticator.getAuth(email, password);
    store.set('email', email);
    const encryptedToken = window.electronAPI.encrypt(JSON.stringify(token));
    store.set('token', encryptedToken);
    status.textContent = 'Login successful!';
  } catch (error) {
    console.error('Login failed:', error);
    status.textContent = 'Login failed.';
  }
});

// Launch
launchBtn.addEventListener('click', async () => {
  const client = new Client();
  const version = versionSelect.value;
  const mod = modSelect.value;
  const root = store.get('minecraftDir');
  const memory = parseInt(memoryInput.value);

  let opts = {
    clientPackage: null,
    authorization: token || Authenticator.getAuth(playerNameInput.value),
    root,
    version: {
      number: version,
      type: versionTypeSelect.value,
      custom: mod.startsWith('forge') ? 'forge' : mod.startsWith('fabric') ? 'fabric' : null
    },
    forge: mod.startsWith('forge') ? mod.replace('forge-', '') : null,
    fabric: mod.startsWith('fabric') ? mod.replace('fabric-', '') : null,
    memory: {
      max: `${memory}M`,
      min: `${Math.floor(memory / 2)}M`
    }
  };

  client.launch(opts);

  client.on('debug', (e) => console.log(e));
  client.on('data', (e) => console.log(e));
  client.on('progress', (e) => {
    if (e.type === 'assets' || e.type === 'libraries') {
      status.textContent = `Downloading ${e.type}: ${Math.round((e.task / e.total) * 100)}%`;
      progress.style.display = 'block';
      progress.className = 'spinner';
    }
  });
  client.on('close', () => {
    status.textContent = 'Game closed.';
    progress.style.display = 'none';
  });
  client.on('error', (e) => {
    console.error('Launch error:', e);
    status.textContent = 'Launch error: ' + e.message;
    progress.style.display = 'none';
  });

  store.set('playerName', playerNameInput.value);
});

// Save settings
themeSelect.addEventListener('change', () => {
  document.documentElement.setAttribute('data-theme', themeSelect.value);
  store.set('theme', themeSelect.value);
});

memoryInput.addEventListener('change', () => {
  store.set('memory', parseInt(memoryInput.value));
});

fullscreenCheckbox.addEventListener('change', () => {
  window.electronAPI.toggleFullscreen();
});

openMinecraftBtn.addEventListener('click', () => window.electronAPI.openFolder('.minecraft'));
openFelisBtn.addEventListener('click', () => window.electronAPI.openFolder('.FelisLauncher'));

checkUpdateBtn.addEventListener('click', () => window.electronAPI.checkForUpdate());

// Initial load
loadSettings();
fetchNews();
fetchVersions();