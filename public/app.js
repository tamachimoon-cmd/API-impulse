const form = document.querySelector('#check-form');
const urlInput = document.querySelector('#url');
const submitButton = form.querySelector('button');
const feedback = document.querySelector('#feedback');
const historyBody = document.querySelector('#history-body');
const clearButton = document.querySelector('#clear-button');
const exportButton = document.querySelector('#export-button');
const canvas = document.querySelector('#latency-chart');

let checks = [];

const formatTime = (value) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'medium'
}).format(new Date(value));

function updateMetrics(check) {
  document.querySelector('#metric-status').textContent = check.status ?? 'ERRO';
  document.querySelector('#metric-latency').textContent = `${check.latencyMs} ms`;
  document.querySelector('#metric-availability').textContent = check.available ? 'Disponível' : 'Indisponível';
  document.querySelector('#metric-time').textContent = formatTime(check.checkedAt);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderHistory() {
  if (!checks.length) {
    historyBody.innerHTML = '<tr><td colspan="4" class="empty">Nenhuma verificação ainda.</td></tr>';
    drawChart();
    return;
  }

  historyBody.innerHTML = checks.map((check) => `
    <tr>
      <td title="${escapeHtml(check.url)}">${escapeHtml(check.url)}</td>
      <td><span class="status ${check.available ? 'good' : 'bad'}">${check.status ?? 'ERRO'}</span></td>
      <td>${check.latencyMs} ms</td>
      <td>${formatTime(check.checkedAt)}</td>
    </tr>
  `).join('');
  drawChart();
}

function drawChart() {
  const context = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);

  const points = [...checks].reverse().slice(-20);
  if (!points.length) {
    context.fillStyle = '#91a0b8';
    context.font = '14px system-ui';
    context.textAlign = 'center';
    context.fillText('O gráfico aparecerá após a primeira verificação.', width / 2, height / 2);
    return;
  }

  const padding = 28;
  const max = Math.max(...points.map((item) => item.latencyMs), 100);
  const stepX = points.length === 1 ? 0 : (width - padding * 2) / (points.length - 1);
  const mapY = (value) => height - padding - (value / max) * (height - padding * 2);

  context.strokeStyle = 'rgba(255,255,255,.08)';
  context.lineWidth = 1;
  for (let index = 0; index < 4; index += 1) {
    const y = padding + index * ((height - padding * 2) / 3);
    context.beginPath(); context.moveTo(padding, y); context.lineTo(width - padding, y); context.stroke();
  }

  const gradient = context.createLinearGradient(0, padding, 0, height - padding);
  gradient.addColorStop(0, '#34d5ff');
  gradient.addColorStop(1, '#7c5cff');
  context.strokeStyle = gradient;
  context.lineWidth = 3;
  context.lineJoin = 'round';
  context.beginPath();
  points.forEach((point, index) => {
    const x = padding + index * stepX;
    const y = mapY(point.latencyMs);
    index === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  });
  context.stroke();
}

async function loadHistory() {
  const response = await fetch('/api/checks');
  const data = await response.json();
  checks = data.checks;
  if (checks[0]) updateMetrics(checks[0]);
  renderHistory();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = 'Verificando...';
  feedback.className = 'feedback';
  feedback.textContent = 'Consultando o endpoint.';

  try {
    const response = await fetch('/api/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: urlInput.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Falha na verificação.');

    checks.unshift(data);
    updateMetrics(data);
    renderHistory();
    feedback.textContent = data.error ? data.error : `Resposta recebida com status ${data.status}.`;
    feedback.classList.toggle('error', !data.available);
  } catch (error) {
    feedback.textContent = error.message;
    feedback.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Verificar agora';
  }
});

clearButton.addEventListener('click', async () => {
  await fetch('/api/checks', { method: 'DELETE' });
  checks = [];
  renderHistory();
});

exportButton.addEventListener('click', () => {
  if (!checks.length) return;
  const rows = [['url', 'status', 'available', 'latency_ms', 'checked_at', 'error']];
  checks.forEach((item) => rows.push([
    item.url, item.status ?? '', item.available, item.latencyMs, item.checkedAt, item.error ?? ''
  ]));
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = `api-impulse-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

window.addEventListener('resize', drawChart);
loadHistory().catch((error) => {
  feedback.textContent = error.message;
  feedback.classList.add('error');
});
