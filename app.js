const API_URL = 'https://jsonplaceholder.typicode.com/users';
const contactList = document.querySelector('#contact-list');
const searchInput = document.querySelector('#search-input');
const companyFilter = document.querySelector('#company-filter');
const sortSelect = document.querySelector('#sort-select');
const contactCount = document.querySelector('#contact-count');
const emptyState = document.querySelector('#empty-state');
const updatedLabel = document.querySelector('#updated-label');
const connectionDot = document.querySelector('#connection-dot');
const connectionLabel = document.querySelector('#connection-label');
const refreshButton = document.querySelector('#refresh-button');

let contacts = [];

const avatarColors = [
  ['#e7eee4', '#477455'], ['#f5e5df', '#a95f48'], ['#e7eafa', '#5967a2'],
  ['#f6edcf', '#947727'], ['#e4eef0', '#477681'], ['#f1e6ee', '#96617f'],
];

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function updateConnectionStatus() {
  const isOnline = navigator.onLine;
  connectionDot.classList.toggle('offline', !isOnline);
  connectionLabel.textContent = isOnline ? 'Conectado' : 'Sin conexión';
}

function renderContacts() {
  const query = searchInput.value.trim().toLocaleLowerCase('es');
  const selectedCompany = companyFilter.value;
  const visibleContacts = contacts
    .filter((contact) => selectedCompany === 'all' || contact.company.name === selectedCompany)
    .filter((contact) => `${contact.name} ${contact.username} ${contact.email} ${contact.company.name}`.toLocaleLowerCase('es').includes(query))
    .sort((first, second) => {
      const firstValue = sortSelect.value === 'company' ? first.company.name : first.name;
      const secondValue = sortSelect.value === 'company' ? second.company.name : second.name;
      return firstValue.localeCompare(secondValue, 'es');
    });

  contactCount.textContent = String(visibleContacts.length);
  emptyState.hidden = visibleContacts.length > 0;
  contactList.hidden = visibleContacts.length === 0;
  contactList.innerHTML = visibleContacts.map((contact, index) => {
    const [background, foreground] = avatarColors[index % avatarColors.length];
    const companyHue = (contact.id * 47) % 360;
    return `<article class="contact-card" style="animation-delay:${Math.min(index * 30, 240)}ms">
      <div class="person-cell">
        <div class="avatar" style="background:${background};color:${foreground}" aria-hidden="true">${escapeHtml(initials(contact.name))}</div>
        <div class="person-info"><div class="person-name">${escapeHtml(contact.name)}</div><div class="person-username">@${escapeHtml(contact.username)}</div></div>
      </div>
      <div class="contact-detail" title="${escapeHtml(contact.email)}"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4" width="15" height="12" rx="2"/><path d="m3.5 5 6.5 5 6.5-5"/></svg>${escapeHtml(contact.email)}</div>
      <div><span class="company-pill" style="--pill-color:hsl(${companyHue} 36% 52%)">${escapeHtml(contact.company.name)}</span></div>
      <span class="row-arrow" aria-hidden="true">↗</span>
    </article>`;
  }).join('');
}

function setContacts(users) {
  contacts = users;
  const companies = [...new Set(users.map((user) => user.company.name))].sort((a, b) => a.localeCompare(b, 'es'));
  companyFilter.innerHTML = '<option value="all">Todas las empresas</option>' + companies
    .map((company) => `<option value="${escapeHtml(company)}">${escapeHtml(company)}</option>`).join('');
  renderContacts();
}

async function loadContacts({ forceRefresh = false } = {}) {
  refreshButton.classList.add('is-loading');
  refreshButton.disabled = true;
  contactList.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(API_URL, { cache: forceRefresh ? 'reload' : 'default' });
    if (!response.ok) throw new Error(`La API respondió ${response.status}`);
    const users = await response.json();
    setContacts(users);
    updatedLabel.textContent = navigator.onLine ? 'Sincronizado ahora' : 'Datos guardados en este dispositivo';
  } catch (error) {
    if (contacts.length) {
      updatedLabel.textContent = 'Mostrando datos guardados';
    } else {
      contactList.innerHTML = '<div class="loading-state"><span>No hay datos guardados. Conéctate una vez para descargar el directorio.</span></div>';
      contactCount.textContent = '0';
    }
    console.error('No se pudo cargar el directorio:', error);
  } finally {
    refreshButton.classList.remove('is-loading');
    refreshButton.disabled = false;
    contactList.setAttribute('aria-busy', 'false');
  }
}

searchInput.addEventListener('input', renderContacts);
companyFilter.addEventListener('change', renderContacts);
sortSelect.addEventListener('change', renderContacts);
refreshButton.addEventListener('click', () => loadContacts({ forceRefresh: true }));
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
window.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

updateConnectionStatus();
loadContacts();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.error('No se pudo registrar el service worker:', error));
  });
}