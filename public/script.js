'use strict';

// Semua jawaban ditampilkan dengan textContent, termasuk konten dari model AI.
const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'siapkerja.sessions.v1';
const labels = {
  level: { fresh: 'Fresh graduate', junior: 'Junior', mid: 'Mid-level' },
  type: { hr: 'HR & perilaku', technical: 'Teknis' },
};
let sessions = readSessions();
let active = null;
let busy = false;
let serviceMode = null;
let selectedType = 'hr';
let failedRequest = null;
let toastTimer;
let lastDialogFocus;

function setServiceMode(mode) {
  serviceMode = mode;
  const status = $('service-status');
  status.replaceChildren(el('span', 'status-dot'), document.createTextNode(mode === 'demo' ? 'Mode contoh' : 'Gemini AI aktif'));
  status.classList.toggle('demo', mode === 'demo');
}

function readSessions() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(isSavedSession).slice(0, 15);
  } catch { return []; }
}

function validList(value) {
  return Array.isArray(value) && value.length >= 1 && value.length <= 4
    && value.every((item) => typeof item === 'string' && item.length <= 1000);
}

function validFeedback(value, mode, summary = false) {
  return value && typeof value === 'object'
    && (mode === 'demo' ? value.score === null : Number.isInteger(value.score) && value.score >= 1 && value.score <= 5)
    && validList(value.strengths) && validList(value.improvements)
    && (summary ? typeof value.headline === 'string' && value.headline.length <= 300 && validList(value.nextSteps)
      : typeof value.sampleAnswer === 'string' && value.sampleAnswer.length <= 3000);
}

function isSavedSession(value) {
  return value && typeof value.id === 'string' && typeof value.createdAt === 'string'
    && value.settings && typeof value.settings.role === 'string'
    && ['fresh', 'junior', 'mid'].includes(value.settings.level)
    && ['hr', 'technical'].includes(value.settings.type)
    && ['id', 'en'].includes(value.settings.language)
    && [3, 5, 7].includes(value.settings.totalQuestions)
    && Number.isInteger(value.answered) && value.answered >= 0
    && value.answered <= value.settings.totalQuestions
    && Array.isArray(value.conversation) && Array.isArray(value.entries)
    && value.entries.length <= 15 && value.conversation.length <= 15
    && value.entries.every((entry) => entry && ['user', 'model'].includes(entry.role) && typeof entry.text === 'string'
      && entry.text.length <= 6000 && (!entry.feedback || validFeedback(entry.feedback, value.mode)))
    && value.conversation.every((entry, index) => entry && entry.role === (index % 2 === 0 ? 'model' : 'user')
      && typeof entry.text === 'string' && entry.text.length <= 6000)
    && value.conversation.length === value.answered * 2 + 1
    && value.entries.length === value.conversation.length
    && ['live', 'demo'].includes(value.mode)
    && (!value.summary || validFeedback(value.summary, value.mode, true));
}

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4200);
}

function persist() {
  if (!active) return;
  sessions = [active, ...sessions.filter((item) => item.id !== active.id)].slice(0, 15);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); }
  catch { toast('Penyimpanan browser penuh. Kamu tetap bisa mengunduh hasil latihan.'); }
  $('history-count').textContent = sessions.length;
}

function readSettings() {
  return {
    role: $('job-role').value.trim(),
    level: $('experience').value,
    type: selectedType,
    language: $('language').value,
    totalQuestions: Number($('question-total').value),
  };
}

function applySettings(settings) {
  $('job-role').value = settings.role;
  $('experience').value = settings.level;
  $('language').value = settings.language;
  $('question-total').value = String(settings.totalQuestions);
  selectType(settings.type);
  updateEstimate();
}

function selectType(type) {
  selectedType = type;
  document.querySelectorAll('[data-type]').forEach((button) => {
    const selected = button.dataset.type === type;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function updateEstimate() {
  const count = Number($('question-total').value);
  $('session-estimate').textContent = `Sekitar ${count * 2}–${count * 3} menit`;
}

function updateControls() {
  const started = Boolean(active);
  const readOnly = started && serviceMode && active.mode !== serviceMode;
  const finished = started && active.answered >= active.settings.totalQuestions;
  const complete = started && Boolean(active.summary);
  document.querySelectorAll('#setup-form input, #setup-form select, #setup-form [data-type]').forEach((node) => {
    node.disabled = busy || (started && !complete);
  });
  $('start-button').disabled = busy || (started && !complete);
  $('start-button').querySelector('span').textContent = busy && !active ? 'Menyiapkan sesi…'
    : started && !complete ? 'Latihan berlangsung' : complete ? 'Mulai sesi baru' : 'Mulai latihan';
  $('answer-input').disabled = busy || !started || finished || complete || readOnly;
  $('answer-input').placeholder = readOnly ? 'Mode layanan berubah. Mulai sesi baru untuk melanjutkan.' : complete ? 'Sesi selesai. Siap mencoba lagi?'
    : finished ? 'Semua pertanyaan sudah dijawab. Lihat rangkumanmu.'
      : active?.settings.language === 'en' ? 'Share your answer here…' : 'Ceritakan jawabanmu di sini…';
  $('send-button').disabled = $('answer-input').disabled || !$('answer-input').value.trim();
  $('new-button').disabled = busy || !started;
  $('export-button').disabled = busy || !started;
  $('summary-actions').hidden = !finished || complete;
  $('summary-button').disabled = busy || readOnly;
  $('summary-button').firstChild.textContent = busy ? 'Menyusun rangkuman… ' : 'Lihat rangkuman ';
  document.querySelector('.chat-panel').classList.toggle('active-session', started);
  $('chat-progress').hidden = !started;
  $('mode-banner').hidden = !readOnly && (active?.mode || serviceMode) !== 'demo';
  const modeCopy = $('mode-banner').querySelector('span');
  if (readOnly) {
    modeCopy.textContent = 'Mode layanan berubah. Sesi ini tetap bisa dibaca dan diunduh. Mulai sesi baru untuk melanjutkan latihan.';
  } else {
    modeCopy.replaceChildren(el('strong', '', 'Mode contoh. '), document.createTextNode('Pertanyaan dan feedback adalah contoh, bukan evaluasi AI atas jawabanmu.'));
  }
  $('interview-subtitle').textContent = started
    ? `${active.settings.role} · ${labels.type[active.settings.type]} · ${labels.level[active.settings.level]}`
    : 'Siap mendengarkan cerita terbaikmu';
  if (started) {
    const count = active.settings.totalQuestions;
    const question = Math.min(active.answered + 1, count);
    $('progress-label').textContent = complete ? 'Latihan selesai' : finished ? `${count} pertanyaan terjawab` : `Pertanyaan ${question} dari ${count}`;
    $('progress-fill').style.width = `${Math.round(active.answered / count * 100)}%`;
    $('progress-percent').textContent = `${Math.round(active.answered / count * 100)}%`;
  }
  $('character-count').textContent = `${$('answer-input').value.length} / 4000`;
}

function bulletList(items, ordered = false) {
  const list = el(ordered ? 'ol' : 'ul');
  if (Array.isArray(items)) items.filter((item) => typeof item === 'string').forEach((item) => list.append(el('li', '', item)));
  return list;
}

function addFeedback(parent, feedback, mode) {
  if (!feedback || typeof feedback !== 'object') return;
  const card = el('div', 'feedback-card');
  const heading = el('div', 'feedback-title');
  heading.append(icon('spark'), document.createTextNode(mode === 'demo' ? 'Contoh feedback' : 'Catatan untuk jawabanmu'));
  if (mode === 'live' && Number.isFinite(feedback.score)) heading.append(el('span', 'feedback-score', `${feedback.score} / 5`));
  card.append(heading);
  card.append(el('h4', '', mode === 'demo' ? 'Hal yang bisa ditonjolkan' : 'Yang sudah kuat'), bulletList(feedback.strengths));
  card.append(el('h4', '', 'Coba kembangkan'), bulletList(feedback.improvements));
  if (typeof feedback.sampleAnswer === 'string' && feedback.sampleAnswer) {
    const details = el('details');
    details.append(el('summary', '', 'Lihat contoh struktur jawaban'), el('p', '', feedback.sampleAnswer));
    card.append(details);
  }
  parent.append(card);
}

function createMessage(entry, mode) {
  const row = el('article', `message ${entry.role}`);
  const avatar = el('span', 'message-avatar', entry.role === 'user' ? 'K' : undefined);
  if (entry.role === 'model') avatar.append(icon('spark'));
  avatar.setAttribute('aria-hidden', 'true');
  const body = el('div', 'message-body');
  const label = el('div', 'message-label', entry.role === 'user' ? 'Kamu' : 'SiapKerja');
  if (mode === 'demo' && entry.role === 'model') label.append(el('span', 'example-label', 'CONTOH'));
  body.append(label);
  addFeedback(body, entry.feedback, mode);
  body.append(el('div', 'message-text', entry.text));
  row.append(avatar, body);
  return row;
}

function createSummary(summary, mode) {
  const report = el('section', 'summary-report');
  report.setAttribute('aria-label', 'Rangkuman latihan');
  report.append(el('span', 'report-kicker', mode === 'demo' ? 'CONTOH RANGKUMAN · BUKAN PENILAIAN AI' : 'SATU LANGKAH LEBIH SIAP'));
  report.append(el('h3', '', summary.headline || 'Latihan hari ini, bekal untuk esok.'));
  report.append(el('div', 'report-score', mode === 'demo' ? 'Mode contoh tidak memberikan skor atas jawabanmu.' : `Skor latihan: ${summary.score} / 5 · Untuk refleksi, bukan penilaian rekrutmen.`));
  report.append(el('h4', '', 'Kekuatan yang bisa dibangun'), bulletList(summary.strengths));
  report.append(el('h4', '', 'Ruang untuk berkembang'), bulletList(summary.improvements));
  report.append(el('h4', '', 'Langkah berikutnya'), bulletList(summary.nextSteps, true));
  const actions = el('div', 'report-actions');
  const download = el('button', 'secondary-button', 'Unduh hasil latihan');
  download.prepend(icon('download'));
  download.addEventListener('click', exportSession);
  const next = el('button', 'secondary-button', 'Latihan lagi');
  next.append(icon('arrow'));
  next.addEventListener('click', newSession);
  actions.append(download, next);
  report.append(actions);
  return report;
}

function renderMessages() {
  $('empty-state').hidden = Boolean(active);
  $('messages').replaceChildren();
  if (active) {
    active.entries.forEach((entry) => $('messages').append(createMessage(entry, active.mode)));
    if (active.summary) $('messages').append(createSummary(active.summary, active.mode));
  }
  updateControls();
}

function scrollMessages() {
  requestAnimationFrame(() => { $('chat-scroll').scrollTop = $('chat-scroll').scrollHeight; });
}

function showLoading() {
  const row = el('div', 'message model');
  row.id = 'pending-message';
  const avatar = el('span', 'message-avatar');
  avatar.append(icon('spark'));
  const body = el('div', 'message-body');
  body.append(el('div', 'message-label', 'SiapKerja sedang menyiapkan respons…'));
  const dots = el('div', 'loading-dots');
  dots.append(el('span'), el('span'), el('span'));
  body.append(dots);
  row.append(avatar, body);
  $('messages').append(row);
  scrollMessages();
}

async function runAction(action, answerText, retrySettings) {
  if (busy) return;
  if (action !== 'start' && active && serviceMode && active.mode !== serviceMode) {
    toast('Mulai sesi baru untuk menggunakan mode layanan saat ini.');
    return;
  }
  const settings = action === 'start' ? (retrySettings || readSettings()) : active?.settings;
  if (!settings) return;
  if (action === 'start' && (!settings.role || settings.role.length > 100)) {
    $('job-role').reportValidity();
    return;
  }
  const conversation = action === 'start' ? [] : active.conversation.map((entry) => ({ ...entry }));
  if (action === 'answer') conversation.push({ role: 'user', text: answerText });
  const payload = { action, settings, conversation, questionIndex: action === 'start' ? 0 : action === 'answer' ? active.answered + 1 : active.answered };
  busy = true;
  failedRequest = null;
  $('error-banner').hidden = true;
  $('empty-state').hidden = true;
  updateControls();
  if (action === 'answer') $('messages').append(createMessage({ role: 'user', text: answerText }, active.mode));
  showLoading();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 70000);
  let success = false;
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Respons belum berhasil diterima. Silakan coba lagi.');
    if (!['live', 'demo'].includes(data.mode) || typeof data.reply !== 'string'
      || (action === 'answer' && !data.feedback) || (action === 'summary' && !data.summary)) {
      throw new Error('Format respons belum sesuai. Silakan coba lagi.');
    }
    setServiceMode(data.mode);
    if (action !== 'start' && data.mode !== active.mode) {
      throw new Error('Mode layanan telah berubah. Sesi lama tetap tersimpan; mulai sesi baru untuk melanjutkan.');
    }
    if (action === 'start') {
      active = {
        id: crypto.randomUUID(), createdAt: new Date().toISOString(), settings,
        answered: 0, conversation: [{ role: 'model', text: data.reply }],
        entries: [{ role: 'model', text: data.reply }], mode: data.mode, summary: null,
      };
      applySettings(settings);
    } else if (action === 'answer') {
      active.conversation = [...conversation, { role: 'model', text: data.reply }];
      active.entries.push({ role: 'user', text: answerText }, { role: 'model', text: data.reply, feedback: data.feedback });
      active.answered += 1;
      active.mode = data.mode;
    } else {
      active.summary = data.summary;
      active.mode = data.mode;
    }
    if (action !== 'summary') $('answer-input').value = '';
    persist();
    success = true;
  } catch (error) {
    failedRequest = { action, answerText, settings };
    $('error-text').textContent = error.name === 'AbortError'
      ? 'Respons memerlukan waktu lebih lama. Jawabanmu tetap ada; coba lagi sebentar.'
      : error instanceof TypeError ? 'Koneksi ke server terputus. Pastikan server berjalan lalu coba lagi.' : error.message;
    $('error-banner').hidden = false;
    if (action === 'answer') $('answer-input').value = answerText;
  } finally {
    clearTimeout(timer);
    busy = false;
    renderMessages();
    scrollMessages();
    if (success && action === 'start' && matchMedia('(max-width:760px)').matches) document.querySelector('.chat-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (success && action !== 'summary' && !$('answer-input').disabled) $('answer-input').focus({ preventScroll: true });
  }
}

function sendAnswer() {
  const text = $('answer-input').value.trim();
  if (!text || text.length > 4000 || !active || busy || active.answered >= active.settings.totalQuestions) return;
  runAction('answer', text);
}

function resetSession() {
  active = null;
  failedRequest = null;
  $('answer-input').value = '';
  $('error-banner').hidden = true;
  renderMessages();
  $('job-role').focus();
}

function newSession() {
  if (busy) return;
  if (!active || active.summary) { resetSession(); return; }
  openDialog('Mulai sesi baru?', (content) => {
    content.append(el('p', 'dialog-copy', 'Sesi ini sudah tersimpan di riwayat. Kamu bisa melanjutkannya nanti.'));
    const actions = el('div', 'dialog-actions');
    const cancel = el('button', 'secondary-button', 'Lanjutkan sesi ini');
    cancel.addEventListener('click', closeDialog);
    const confirm = el('button', 'primary-button', 'Mulai sesi baru');
    confirm.addEventListener('click', () => { closeDialog(); resetSession(); });
    actions.append(cancel, confirm);
    content.append(actions);
  });
}

function openDialog(title, build) {
  lastDialogFocus = document.activeElement;
  $('dialog-title').textContent = title;
  $('dialog-content').replaceChildren();
  build($('dialog-content'));
  if (!$('app-dialog').open) $('app-dialog').showModal();
}

function closeDialog() {
  $('app-dialog').close();
  if (lastDialogFocus?.isConnected) lastDialogFocus.focus({ preventScroll: true });
}

function showGuide() {
  closeSidebar();
  openDialog('Ceritakan dengan metode STAR', (content) => {
    content.append(el('p', 'dialog-copy', 'Buat jawaban yang konkret dan mudah diikuti. Gunakan pengalaman kuliah, organisasi, proyek pribadi, atau pekerjaanmu.'));
    [
      ['S', 'Situation · Situasi', 'Berikan konteks singkat. Apa masalahnya, kapan terjadi, dan siapa yang terlibat?'],
      ['T', 'Task · Tugas', 'Apa tanggung jawab atau tujuanmu dalam situasi tersebut?'],
      ['A', 'Action · Tindakan', 'Jelaskan langkah spesifik yang kamu lakukan. Fokus pada kontribusimu sendiri.'],
      ['R', 'Result · Hasil', 'Ceritakan dampaknya dan apa yang kamu pelajari. Gunakan angka jika memang ada; tidak perlu mengarang.'],
    ].forEach(([letter, title, copy]) => {
      const step = el('div', 'star-step');
      const text = el('div');
      text.append(el('strong', '', title), el('p', '', copy));
      step.append(el('span', 'star-letter', letter), text);
      content.append(step);
    });
    content.append(el('p', 'dialog-copy', 'Contoh: “Saat tugas kelompok mendekati tenggat (S), saya bertanggung jawab memperbaiki tampilan mobile (T). Saya memetakan masalah dan memperbaiki CSS (A). Tim berhasil mengumpulkan proyek tepat waktu (R).”'));
  });
}

function showAbout() {
  openDialog('Tentang ruang latihanmu', (content) => {
    content.append(el('p', 'dialog-copy', 'SiapKerja membantu mahasiswa, fresh graduate, dan pencari kerja berlatih interview. Jawaban dan skor adalah bahan refleksi, bukan penilaian rekrutmen atau jaminan diterima kerja.'));
    content.append(el('h3', '', 'Privasi & riwayat'));
    content.append(el('p', 'dialog-copy', 'Maksimal 15 sesi terakhir tersimpan di browser perangkat ini. Kamu bisa mengunduh atau menghapus setiap sesi melalui Riwayat latihan. Menghapus data browser juga menghapus riwayat.'));
    content.append(el('p', 'dialog-copy', 'Saat mode AI aktif, posisi, pengaturan, serta isi percakapan dikirim ke Google Gemini untuk menghasilkan respons. Hindari memasukkan informasi pribadi sensitif atau rahasia perusahaan. Mode contoh menggunakan materi bawaan dan tidak mengirim jawaban ke Gemini.'));
    content.append(el('p', 'dialog-copy', 'Mode contoh ditandai di atas percakapan. Feedback dalam mode ini adalah ilustrasi umum dan tidak menilai jawabanmu.'));
  });
}

function showHistory() {
  closeSidebar();
  openDialog('Riwayat latihan', (content) => {
    content.append(el('p', 'dialog-copy', 'Tersimpan di browser ini. Buka sesi untuk melanjutkan atau mengunduh hasilnya.'));
    if (!sessions.length) content.append(el('p', 'history-empty', 'Belum ada latihan. Cerita pertamamu dimulai di sini.'));
    sessions.forEach((session) => {
      const item = el('div', 'history-item');
      const open = el('button', 'history-open');
      const date = new Date(session.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      open.append(el('strong', '', session.settings.role));
      open.append(el('span', '', `${date} · ${session.answered}/${session.settings.totalQuestions} jawaban · ${session.mode === 'demo' ? 'Contoh' : 'AI'} · ${session.summary ? 'Selesai' : 'Bisa dilanjutkan'}`));
      open.disabled = busy;
      open.addEventListener('click', () => {
        if (busy) return;
        failedRequest = null;
        $('answer-input').value = '';
        $('error-banner').hidden = true;
        if (serviceMode && session.mode !== serviceMode && !session.summary) {
          toast('Mode layanan telah berubah. Buat sesi baru untuk melanjutkan dengan mode saat ini.');
          // Sesi lama tetap dapat dibaca dan diunduh; jangan mencampur feedback contoh dan AI.
          active = structuredClone(session);
          closeDialog(); applySettings(active.settings); renderMessages();
          return;
        }
        active = structuredClone(session);
        failedRequest = null;
        $('answer-input').value = '';
        $('error-banner').hidden = true;
        closeDialog(); applySettings(active.settings); renderMessages(); scrollMessages();
        if (matchMedia('(max-width:760px)').matches) document.querySelector('.chat-panel').scrollIntoView({ behavior: 'smooth' });
      });
      const remove = el('button', 'icon-button');
      remove.append(icon('trash'));
      remove.setAttribute('aria-label', `Hapus latihan ${session.settings.role}`);
      remove.disabled = busy;
      remove.addEventListener('click', () => confirmDelete(session));
      item.append(open, remove);
      content.append(item);
    });
  });
}

function confirmDelete(session) {
  openDialog('Hapus latihan ini?', (content) => {
    content.append(el('p', 'dialog-copy', `Latihan ${session.settings.role} akan dihapus dari browser ini. Unduh dulu hasilnya jika masih diperlukan. Tindakan ini tidak bisa dibatalkan.`));
    const actions = el('div', 'dialog-actions');
    const cancel = el('button', 'secondary-button', 'Batal');
    cancel.addEventListener('click', showHistory);
    const confirm = el('button', 'danger-button', 'Hapus latihan');
    confirm.addEventListener('click', () => {
      const remaining = sessions.filter((item) => item.id !== session.id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining)); }
      catch { toast('Riwayat belum bisa dihapus. Coba lagi.'); return; }
      sessions = remaining;
      if (active?.id === session.id) resetSession();
      $('history-count').textContent = sessions.length;
      showHistory();
      toast('Latihan sudah dihapus dari browser ini.');
    });
    actions.append(cancel, confirm);
    content.append(actions);
  });
}

function exportSession() {
  if (!active) return;
  const session = active;
  const lines = [
    'SiapKerja — Hasil Latihan Interview',
    `Posisi: ${session.settings.role}`, `Pengalaman: ${labels.level[session.settings.level]}`,
    `Fokus: ${labels.type[session.settings.type]}`, `Bahasa: ${session.settings.language}`,
    `Tanggal: ${new Date(session.createdAt).toLocaleString('id-ID')}`,
    `Mode: ${session.mode === 'demo' ? 'CONTOH — bukan evaluasi AI atas jawaban pengguna' : 'Gemini AI'}`,
    `Terjawab: ${session.answered}/${session.settings.totalQuestions}`, '',
  ];
  session.entries.forEach((entry) => {
    lines.push(`${entry.role === 'user' ? 'KAMU' : 'SIAPKERJA'}:`, entry.text, '');
    if (entry.feedback) {
      const f = entry.feedback;
      lines.push(session.mode === 'demo' ? 'CONTOH FEEDBACK:' : `FEEDBACK (skor ${f.score}/5):`);
      lines.push('Kekuatan:', ...(f.strengths || []).map((item) => `- ${item}`), 'Perbaikan:', ...(f.improvements || []).map((item) => `- ${item}`));
      if (f.sampleAnswer) lines.push('Contoh struktur:', f.sampleAnswer);
      lines.push('');
    }
  });
  if (session.summary) {
    const report = session.summary;
    lines.push('RANGKUMAN:', report.headline);
    if (session.mode === 'live') lines.push(`Skor latihan: ${report.score}/5`);
    lines.push('Kekuatan:', ...(report.strengths || []).map((item) => `- ${item}`), 'Perbaikan:', ...(report.improvements || []).map((item) => `- ${item}`), 'Langkah berikutnya:', ...(report.nextSteps || []).map((item, i) => `${i + 1}. ${item}`), '');
  }
  lines.push('Untuk latihan dan refleksi. Bukan penilaian rekrutmen atau jaminan diterima kerja.');
  const url = URL.createObjectURL(new Blob(['\uFEFF', lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const link = el('a');
  link.href = url;
  const safeRole = session.settings.role.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 50);
  const localDate = new Date(session.createdAt);
  const dateStamp = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
  link.download = `SiapKerja-${safeRole}-${dateStamp}.txt`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Hasil latihan diunduh sebagai file TXT.');
}

function closeSidebar() {
  const wasOpen = $('sidebar').classList.contains('open');
  $('sidebar').classList.remove('open');
  $('sidebar-overlay').hidden = true;
  $('menu-button').setAttribute('aria-expanded', 'false');
  document.querySelector('.app-shell').inert = false;
  if (wasOpen) $('menu-button').focus({ preventScroll: true });
}

async function checkHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch('/api/health', { signal: controller.signal });
    if (!response.ok) throw new Error('Unavailable');
    const data = await response.json();
    if (!['live', 'demo'].includes(data.mode)) throw new Error('Invalid service mode');
    setServiceMode(data.mode);
  } catch {
    $('service-status').replaceChildren(el('span', 'status-dot'), document.createTextNode('Server belum terhubung'));
  } finally { clearTimeout(timer); updateControls(); }
}

$('setup-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (busy) return;
  if (active && !active.summary) return;
  if (active) { active = null; renderMessages(); }
  runAction('start');
});
document.querySelectorAll('[data-type]').forEach((button) => button.addEventListener('click', () => selectType(button.dataset.type)));
$('question-total').addEventListener('change', updateEstimate);
$('chat-form').addEventListener('submit', (event) => { event.preventDefault(); sendAnswer(); });
$('answer-input').addEventListener('input', updateControls);
$('answer-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendAnswer(); }
});
$('summary-button').addEventListener('click', () => runAction('summary'));
$('retry-button').addEventListener('click', () => {
  if (failedRequest) runAction(failedRequest.action, failedRequest.answerText, failedRequest.settings);
});
$('nav-guide').addEventListener('click', showGuide);
$('empty-guide').addEventListener('click', showGuide);
$('nav-history').addEventListener('click', showHistory);
$('nav-practice').addEventListener('click', () => { closeSidebar(); closeDialog(); document.querySelector('.workspace').scrollIntoView({ behavior: 'smooth' }); });
$('about-button').addEventListener('click', () => { closeSidebar(); showAbout(); });
$('privacy-button').addEventListener('click', showAbout);
$('new-button').addEventListener('click', newSession);
$('export-button').addEventListener('click', exportSession);
$('close-dialog').addEventListener('click', closeDialog);
$('app-dialog').addEventListener('click', (event) => { if (event.target === $('app-dialog')) { const rect = $('app-dialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(); } });
$('menu-button').addEventListener('click', () => {
  const open = $('sidebar').classList.toggle('open');
  $('sidebar-overlay').hidden = !open;
  $('menu-button').setAttribute('aria-expanded', String(open));
  document.querySelector('.app-shell').inert = open;
  if (open) $('nav-practice').focus();
});
$('sidebar-overlay').addEventListener('click', closeSidebar);
matchMedia('(max-width:760px)').addEventListener('change', closeSidebar);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSidebar(); });
$('history-count').textContent = sessions.length;
updateEstimate();
renderMessages();
checkHealth();
