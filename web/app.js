const state = { analysis: null, history: [], csv: '', salary: {}, deductions: {} };
const $ = (selector) => document.querySelector(selector);
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

function setView(view) {
  document.querySelectorAll('.nav-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === view));
  $('#chat-view').hidden = view !== 'chat';
  $('#upi-view').hidden = view !== 'upi';
  if (view === 'home') $('#home-view').scrollIntoView({behavior:'smooth'});
  if (view === 'chat') $('#chat-view').scrollIntoView({behavior:'smooth'});
  if (view === 'upi') $('#upi-view').scrollIntoView({behavior:'smooth'});
}
document.querySelectorAll('.nav-tab').forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));

$('#slip-text').addEventListener('input', (event) => { $('#char-count').textContent = `${event.target.value.length} characters`; });
$('#hero-analyze').addEventListener('click', () => { $('#analyzer').scrollIntoView({behavior:'smooth'}); $('#slip-text').focus(); });
$('#load-sample').addEventListener('click', () => { $('#slip-text').value = `Monthly Salary\nBasic: ₹50,000\nHRA: ₹25,000\nSpecial Allowance: ₹20,000\nGross Earnings: ₹95,000\nEmployee PF: ₹6,000\nProfessional Tax: ₹200\nTDS: ₹4,500`; $('#slip-text').dispatchEvent(new Event('input')); $('#analyzer').scrollIntoView({behavior:'smooth'}); });
$('#new-analysis').addEventListener('click', () => { $('#results').hidden = true; $('#analyzer').scrollIntoView({behavior:'smooth'}); });

async function request(path, body) {
  const response = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Aksh could not complete that request.');
  return data;
}

function renderAnalysis(data) {
  state.analysis = data; state.salary = data.salary;
  const comparison = data.engine_comparison || data.comparison;
  const recommended = comparison.recommended_regime ? comparison.recommended_regime.toLowerCase() : comparison.lower_tax_regime;
  const engineWarnings = (data.engine_comparison?.warnings || []).map((item) => item.message || item);
  $('#warnings').innerHTML = [...(data.warnings || []), ...engineWarnings].map((warning) => `<div class="warning">${escapeHtml(warning)}</div>`).join('');
  $('#regime-grid').innerHTML = ['old','new'].map((key) => {
    const result = comparison[key] || comparison[`${key}_regime`]; const title = key === 'old' ? 'Old Regime' : 'New Regime';
    const isRecommended = recommended === key;
    return `<article class="regime-card ${isRecommended ? 'recommended' : ''}">${isRecommended ? '<span class="recommended-label">lower tax</span>' : ''}<h3>${title}</h3><div class="tax-number">${money(result.total_tax)}</div><div class="tax-label">calculated total tax</div><div class="metric-row"><span>Taxable income</span><strong>${money(result.taxable_income)}</strong></div><div class="metric-row"><span>Balance after TDS</span><strong>${money(result.balance_tax_payable)}</strong></div></article>`;
  }).join('');
  $('#components').innerHTML = (data.components || []).map((item) => `<div class="component"><strong>${escapeHtml(item.name)}</strong><span>${money(item.amount)}</span><small>${escapeHtml(item.explanation)}</small></div>`).join('') || '<p class="muted">No named components were found.</p>';
  $('#tips').innerHTML = (data.action_plan.tips || []).map((tip) => `<div class="tip"><p class="tip-title">${escapeHtml(tip.title)}</p><p class="tip-detail">${escapeHtml(tip.detail)}</p><div class="tip-saving">${money(tip.saving)} possible saving</div></div>`).join('') || '<p class="muted">You are all set for now — nice work.</p>';
  $('#results').hidden = false; $('#results').scrollIntoView({behavior:'smooth'});
}
$('#analyze-btn').addEventListener('click', async () => {
  const button = $('#analyze-btn'); const error = $('#analysis-error'); error.hidden = true;
  if (!$('#slip-text').value.trim()) { error.textContent = 'Paste your salary slip first — I’ll take it from there.'; error.hidden = false; return; }
  button.disabled = true; button.innerHTML = 'Reading locally…';
  try { renderAnalysis(await request('/api/analyze', {text:$('#slip-text').value, deductions:state.deductions})); }
  catch (err) { error.textContent = err.message; error.hidden = false; }
  finally { button.disabled = false; button.innerHTML = 'Analyze slip <span>→</span>'; }
});

function addMessage(text, role) { const item = document.createElement('div'); item.className = `chat-bubble ${role}`; item.textContent = text; $('#chat-messages').appendChild(item); $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight; }
$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const input = $('#chat-input'); const message = input.value.trim(); const error = $('#chat-error'); error.hidden = true; if (!message) return;
  addMessage(message, 'user'); input.value = ''; const button = event.target.querySelector('button'); button.disabled = true;
  try { const result = await request('/api/chat', {message, history:state.history, context:state.analysis?.engine_context || state.analysis?.comparison || null}); addMessage(result.reply, 'aksh'); state.history.push({role:'user',content:message},{role:'assistant',content:result.reply}); state.history = state.history.slice(-6); }
  catch (err) { error.textContent = err.message; error.hidden = false; }
  finally { button.disabled = false; }
});

$('#upi-file').addEventListener('change', async (event) => { const file = event.target.files[0]; if (!file) return; state.csv = await file.text(); $('#file-label').textContent = file.name; $('#upi-btn').disabled = false; });
$('#upi-btn').addEventListener('click', async () => {
  const button = $('#upi-btn'); const error = $('#upi-error'); error.hidden = true; button.disabled = true; button.innerHTML = 'Checking locally…';
  try { const result = await request('/api/upi', {csv:state.csv, salary:state.salary, deductions:state.deductions}); $('#upi-results').innerHTML = `<div class="upi-total">Possible saving: ${money(result.total_saving)}</div>${result.transactions.map((row) => `<div class="upi-row"><code>${escapeHtml(row.date)}</code><span>${escapeHtml(row.description)}</span><span class="category">${escapeHtml(row.category)}</span><strong>${money(row.est_saving)}</strong></div>`).join('')}<p class="muted">${result.notes.map(escapeHtml).join(' ')}</p>`; }
  catch (err) { error.textContent = err.message; error.hidden = false; }
  finally { button.disabled = false; button.innerHTML = 'Check transactions <span>→</span>'; }
});
