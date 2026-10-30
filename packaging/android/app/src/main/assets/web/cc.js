// Interface vertical estilo CapCut sobre o motor do EffectCraft (window.effectcraft).
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const E = () => window.effectcraft;
  const ex = (c, p) => E().execute(c, p || {});
  const S = { info: null, t: 0, sel: null, playing: false, W: 1080, H: 1920, ia: 0, effects: null };
  const store = { get: k => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const root = document.createElement('div'); root.id = 'cc';
  root.innerHTML = `<div class="cc-top"><b>Animação</b><button class="cc-btn" id="cc-undo">↶</button><button class="cc-btn" id="cc-redo">↷</button><button class="cc-btn cc-pri" id="cc-exp">Exportar</button></div>
  <div class="cc-prev"><img id="cc-img" alt=""></div>
  <div class="cc-tr"><button class="cc-btn" id="cc-play">▶</button><input type="range" id="cc-scrub" min="0" max="1000" value="0"><span id="cc-time">0.0 / 0.0</span></div>
  <div class="cc-tl" id="cc-tl"></div>
  <div class="cc-bar" id="cc-bar"></div>
  <div id="cc-sheet"></div><div class="cc-toast" id="cc-toast" style="display:none"></div>`;
  document.body.appendChild(root);
  const toast = (m, ms = 2200) => { const t = $('#cc-toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(() => t.style.display = 'none', ms); };
  const dur = () => (S.info && S.info.duration) || 8;

  let drawing = false, again = false;
  async function draw() {
    if (drawing) { again = true; return; }
    drawing = true;
    try { const r = await E().renderFrame({ time: S.t, max_side: 720 }); if (r && r.png) $('#cc-img').src = 'data:image/png;base64,' + r.png; }
    catch (e) { console.warn('draw', e); }
    drawing = false; if (again) { again = false; draw(); }
  }
  function ui() {
    $('#cc-scrub').value = Math.round(S.t / dur() * 1000);
    $('#cc-time').textContent = S.t.toFixed(1) + ' / ' + dur().toFixed(1);
    const tl = $('#cc-tl'); const d = dur();
    tl.innerHTML = (S.info.layers || []).map(l => `<div class="cc-lay ${S.sel === l.id ? 'sel' : ''}" data-id="${l.id}"><i style="left:${l.in / d * 100}%;width:${Math.max(4, (l.out - l.in) / d * 100)}%">${esc(l.name)}</i></div>`).join('') + `<div class="cc-head" style="left:calc(8px + ${S.t / d} * (100% - 16px))"></div>`;
    tl.querySelectorAll('.cc-lay').forEach(el => el.onclick = () => select(+el.dataset.id));
  }
  async function refresh(redraw = true) {
    S.info = await ex('comp.info');
    S.W = S.info.width; S.H = S.info.height;
    if (S.sel && !(S.info.layers || []).some(l => l.id === S.sel)) S.sel = null;
    ui(); if (redraw) draw();
  }            async function select(id) { S.sel = id; try { await ex('layer.select', { layers: [id] }); } catch (_) {} ui(); }
  const selLayer = () => (S.info.layers || []).find(l => l.id === S.sel);
  const need = () => { if (!S.sel) { toast('Toque numa camada da linha do tempo'); return false; } return true; };
  async function run(fn, ok) { try { const r = await fn(); await refresh(); if (ok) toast(ok); return r; } catch (e) { toast('Erro: ' + String(e.message || e).slice(0, 120), 4000); console.warn(e); } }

  // ---- folha inferior
  const sheet = $('#cc-sheet');
  function open(title, html, bind) {
    sheet.innerHTML = `<h3>${title}<button class="cc-btn" id="cc-x">✕</button></h3>${html}`; sheet.classList.add('on');
    $('#cc-x').onclick = close; if (bind) bind(sheet);
  }
  function close() { sheet.classList.remove('on'); sheet.innerHTML = ''; }

  const tools = [
    ['🔤', 'Texto', () => open('Texto', `<label>Texto</label><input type="text" id="t1" value="Seu texto"><label>Tamanho: <span id="t2v">120</span></label><input type="range" id="t2" min="30" max="400" value="120"><label>Cor</label><input type="color" id="t3" value="#ffffff"><div class="cc-row" style="margin-top:14px"><button class="cc-btn cc-pri" id="ok">Adicionar</button><button class="cc-btn" id="ed">Editar texto da camada</button></div>`, s => {
      $('#t2').oninput = () => $('#t2v').textContent = $('#t2').value;
      $('#ok').onclick = () => run(() => ex('layer.newText', { text: $('#t1').value, size: +$('#t2').value, fill: $('#t3').value, position: [S.W / 2, S.H / 2] }), 'Texto adicionado');
      $('#ed').onclick = () => need() && run(() => ex('layer.setText', { layer: S.sel, text: $('#t1').value, size: +$('#t2').value, fill: $('#t3').value }), 'Texto alterado');
    })],
    ['⬛', 'Forma', () => open('Forma', `<div class="cc-row">${[['rect', 'Retângulo'], ['rounded', 'Arredondado'], ['ellipse', 'Círculo'], ['star', 'Estrela'], ['polygon', 'Polígono']].map(k => `<button class="cc-chip" data-k="${k[0]}">${k[1]}</button>`).join('')}</div><label>Cor</label><input type="color" id="c1" value="#ffcc00"><label>Tamanho: <span id="sv">400</span></label><input type="range" id="sz" min="50" max="1200" value="400">`, s => {
      $('#sz').oninput = () => $('#sv').textContent = $('#sz').value;
      s.querySelectorAll('[data-k]').forEach(b => b.onclick = () => run(() => ex('layer.newShape', { kind: b.dataset.k, size: [+$('#sz').value, +$('#sz').value], fill: $('#c1').value, position: [S.W / 2, S.H / 2] }), 'Forma adicionada'));
    })],
    ['🎨', 'Fundo', () => open('Cor do fundo', `<input type="color" id="bg" value="#101820"><div class="cc-row" style="margin-top:12px"><button class="cc-btn cc-pri" id="ok">Aplicar</button></div>`, s => $('#ok').onclick = () => run(() => ex('comp.settings', { background: $('#bg').value }), 'Fundo alterado'))],
    ['🖼', 'Mídia', () => open('Imagem ou vídeo', `<input type="file" id="f" accept="image/*,video/*,audio/*"><div class="cc-log" id="lg"></div>`, s => $('#f').onchange = async ev => {
      const f = ev.target.files[0]; if (!f) return; $('#lg').textContent = 'Importando…';
      try { const name = await E().addFile(f); const path = (typeof name === 'string' && name) || f.name;
        await ex('file.import', { paths: [path], addToComp: true }); await refresh(); close(); toast('Mídia adicionada');
      } catch (e) { $('#lg').textContent = 'Erro: ' + (e.message || e); }
    })],
    ['✨', 'Efeitos', async () => {
      if (!S.effects) { try { S.effects = (await ex('effect.list')).map(e => ({ id: e.id, name: e.name, cat: e.category })); } catch (e) { return toast('Erro nos efeitos'); } }
      open('Efeitos', `<input type="text" id="q" placeholder="Buscar (ex.: blur, glow, cor)"><div class="cc-list" id="ls"></div>`, s => {
        const show = () => { const q = $('#q').value.toLowerCase(); $('#ls').innerHTML = S.effects.filter(e => !q || (e.name + e.cat).toLowerCase().includes(q)).slice(0, 60).map(e => `<button data-id="${esc(e.id)}">${esc(e.name)} <small style="color:#789">${esc(e.cat)}</small></button>`).join('');
          $('#ls').querySelectorAll('button').forEach(b => b.onclick = () => need() && run(() => ex('effect.apply', { effect: b.dataset.id, layers: [S.sel] }), 'Efeito aplicado')); };
        $('#q').oninput = show; show();
      });
    }],
    ['🎚', 'Ajustar', () => { if (!need()) return; open('Ajustar camada', ['Opacidade|opacity|0|100|100', 'Escala|scale|10|400|100', 'Rotação|rotation|-180|180|0'].map(x => { const [n, k, a, b, v] = x.split('|'); return `<label>${n}: <span id="${k}v">${v}</span></label><input type="range" id="${k}" min="${a}" max="${b}" value="${v}">`; }).join('') + `<label>Posição X: <span id="pxv">50</span>%</label><input type="range" id="px" min="-20" max="120" value="50"><label>Posição Y: <span id="pyv">50</span>%</label><input type="range" id="py" min="-20" max="120" value="50">`, s => {
      const set = (path, val) => ex('prop.set', { layer: S.sel, path: 'transform/' + path, value: val }).then(() => draw());
      $('#opacity').oninput = e => { $('#opacityv').textContent = e.target.value; set('opacity', +e.target.value); };
      $('#scale').oninput = e => { $('#scalev').textContent = e.target.value; set('scale', [+e.target.value, +e.target.value, 100]); };
      $('#rotation').oninput = e => { $('#rotationv').textContent = e.target.value; set('rotation', +e.target.value); };
      const pos = () => { $('#pxv').textContent = $('#px').value; $('#pyv').textContent = $('#py').value; set('position', [$('#px').value / 100 * S.W, $('#py').value / 100 * S.H, 0]); };
      $('#px').oninput = pos; $('#py').oninput = pos;
    }); }],
    ['🎬', 'Animar', () => { if (!need()) return; const L = selLayer(); const t0 = Math.max(S.t, L ? L.in : 0);
      const P = { 'Aparecer (fade)': [['opacity', 0, 0], ['opacity', 100, 1]], 'Sumir (fade)': [['opacity', 100, 0], ['opacity', 0, 1]], 'Zoom in': [['scale', [60, 60, 100], 0], ['scale', [100, 100, 100], 1]], 'Pulsar': [['scale', [100, 100, 100], 0], ['scale', [115, 115, 100], 0.4], ['scale', [100, 100, 100], 0.8]], 'Girar': [['rotation', 0, 0], ['rotation', 360, 2]] };
      open('Animação (a partir de ' + t0.toFixed(1) + 's)', `<div class="cc-row">${Object.keys(P).map(k => `<button class="cc-chip" data-k="${k}">${k}</button>`).join('')}</div>`, s => s.querySelectorAll('[data-k]').forEach(b => b.onclick = () => run(async () => { for (const [path, v, dt] of P[b.dataset.k]) await ex('prop.addKey', { layer: S.sel, path: 'transform/' + path, time: t0 + dt, value: v }); }, 'Animação aplicada')));
    }],
    ['⧉', 'Duplicar', () => need() && run(() => ex('edit.duplicate', { layers: [S.sel] }), 'Duplicada')],
    ['✂', 'Dividir', () => need() && run(() => ex('edit.splitLayer', {}), 'Dividida no tempo atual')],
    ['🗑', 'Apagar', () => need() && run(async () => { await ex('layer.select', { layers: [S.sel] }); await ex('edit.delete'); S.sel = null; }, 'Apagada')],
    ['🤖', 'IA', () => iaSheet(), 'ia'],
  ];
  const bar = $('#cc-bar');
  tools.forEach(t => { const b = document.createElement('button'); if (t[3]) b.className = t[3]; b.innerHTML = `<span>${t[0]}</span>${t[1]}`; b.onclick = t[2]; bar.appendChild(b); });

  // ---- IA (Groq)
  const CMDS = ['comp.settings', 'layer.newText', 'layer.newShape', 'layer.newSolid', 'layer.setText', 'layer.select', 'layer.rename', 'layer.timing', 'prop.set', 'prop.addKey', 'effect.apply', 'edit.delete', 'edit.duplicate', 'edit.splitLayer', 'layer.setBlendMode'];
  let allCmds = null;
  async function catalog() {
    if (!allCmds) allCmds = await E().commands();
    const ids = new Set(allCmds.map(c => c.id));
    const doc = CMDS.map(id => { const c = allCmds.find(x => x.id === id); return c ? `${id} ${String(c.params || '').slice(0, 230)}` : ''; }).filter(Boolean).join('\n');
    return { ids, doc };
  }
  function iaSheet() {
    open('IA (Groq)', `<label>Chave do Groq (fica só neste celular)</label><input type="password" id="k" placeholder="gsk_..." value="${esc(store.get('groq_key'))}"><label>Modelo</label><input type="text" id="m" value="${esc(store.get('groq_model') || 'openai/gpt-oss-120b')}"><label>O que você quer criar ou mudar?</label><textarea id="p" rows="3" placeholder="Ex.: título 'Motor a Jato' grande no topo, fundo azul escuro e um círculo laranja no meio"></textarea><div class="cc-row" style="margin-top:12px"><button class="cc-btn cc-pri" id="go">Enviar</button><button class="cc-btn" id="un">Desfazer o da IA</button></div><div class="cc-log" id="lg"></div>`, s => {
      const log = t => $('#lg').textContent = t;
      $('#un').onclick = async () => { const n = S.ia; S.ia = 0; for (let i = 0; i < n; i++) await ex('edit.undo'); await refresh(); log('Desfeito: ' + n + ' passo(s).'); };
      $('#go').onclick = async () => {
        const key = $('#k').value.trim(), model = $('#m').value.trim(), ask = $('#p').value.trim();
        if (!key || !ask) return log('Preencha a chave e o pedido.');
        store.set('groq_key', key); store.set('groq_model', model); log('Pensando…');
        try {
          const { ids, doc } = await catalog(); await refresh(false);
          const st = `Composição ${S.W}x${S.H}px, ${dur()}s, camadas: ` + ((S.info.layers || []).map(l => `{id:${l.id},nome:"${l.name}",tipo:${l.type}}`).join(', ') || 'nenhuma') + `. Camada selecionada: ${S.sel || 'nenhuma'}. Tempo atual: ${S.t.toFixed(1)}s.`;
          const sys = `Você controla um editor de animações por comandos JSON. Responda SOMENTE com JSON: {"explicacao":"curta, em português","comandos":[{"command":"id","params":{...}}]}. Use APENAS estes comandos e só os parâmetros listados; não invente nomes. Coordenadas em pixels da composição (origem no canto superior esquerdo). Cores em #hex. Camadas pelo número id. Em prop.set/prop.addKey o path é "transform/opacity" (0-100), "transform/position" ([x,y,0]), "transform/scale" ([%,%,100]) ou "transform/rotation" (graus). Se faltar informação ou não der para fazer com estes comandos, devolva comandos vazios e explique.\nCOMANDOS:\n${doc}`;
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key }, body: JSON.stringify({ model, temperature: 0.2, max_tokens: 1500, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: st + '\nPedido: ' + ask }] }) });
          if (!r.ok) throw new Error('Groq ' + r.status + ': ' + (await r.text()).slice(0, 200));
          const out = JSON.parse((await r.json()).choices[0].message.content);
          const cmds = Array.isArray(out.comandos) ? out.comandos : [];
          const bad = cmds.filter(c => !c || !ids.has(c.command) || !CMDS.includes(c.command));
          if (bad.length) return log('A IA pediu comandos que não existem ou não são permitidos: ' + bad.map(b => b && b.command).join(', ') + '. Nada foi alterado. Tente descrever de outro jeito.');
          let done = 0; S.ia = 0;
          for (const c of cmds) { try { await ex(c.command, c.params || {}); done++; S.ia++; } catch (e) { log((out.explicacao || '') + '\n\nParou no passo ' + (done + 1) + ' (' + c.command + '): ' + (e.message || e)); await refresh(); return; } }
          await refresh(); log((out.explicacao || 'Pronto.') + '\n\n' + done + ' passo(s) aplicados.');
        } catch (e) { log('Erro: ' + (e.message || e)); }
      };
    });
  }

  // ---- exportar
  $('#cc-exp').onclick = () => open('Exportar', `<div class="cc-row"><button class="cc-btn cc-pri" id="png">Salvar quadro atual (PNG)</button><button class="cc-btn" id="mp4">Gerar vídeo MP4</button></div><div class="cc-log" id="lg"></div>`, s => {
    const log = t => $('#lg').textContent = t;
    const save = (bytes, name, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
    $('#png').onclick = async () => { const r = await E().renderFrame({ time: S.t }); const b = atob(r.png), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); save(u, 'quadro.png', 'image/png'); log('Quadro salvo.'); };
    $('#mp4').onclick = async () => { log('Renderizando… pode demorar.'); try {
      await ex('renderQueue.add', { format: 'h264', output: 'animacao.mp4', timeSpan: 'comp' }); await ex('renderQueue.render', { wait: true });
      const f = (await E().files()).find(x => /animacao.*\.mp4$/i.test(x.path)); if (!f) throw new Error('arquivo de saída não encontrado');
      save(await E().readFile(f.path), 'animacao.mp4', 'video/mp4'); log('Vídeo gerado: ' + f.path);
    } catch (e) { log('Erro ao gerar vídeo: ' + (e.message || e)); } };
  });

  // ---- reprodução e controles
  $('#cc-scrub').oninput = e => { S.t = e.target.value / 1000 * dur(); ui(); draw(); };
  $('#cc-undo').onclick = () => run(() => ex('edit.undo'));
  $('#cc-redo').onclick = () => run(() => ex('edit.redo'));
  $('#cc-play').onclick = () => { S.playing = !S.playing; $('#cc-play').textContent = S.playing ? '⏸' : '▶'; if (S.playing) { let last = performance.now(); (function tick(now) { if (!S.playing) return; S.t += (now - last) / 1000; last = now; if (S.t >= dur()) S.t = 0; ui(); draw(); requestAnimationFrame(tick); })(last); } };

  // ---- início
  (async function boot() {
    for (let i = 0; i < 400; i++) { try { if (E()) { await ex('project.summary'); break; } } catch (_) {} await new Promise(r => setTimeout(r, 300)); }
    try {
      await ex('comp.new', { name: 'Animação', width: 1080, height: 1920, frameRate: 30, duration: 8, background: '#101820' });
      await refresh(); root.classList.add('on'); const l = $('#loading'); if (l) l.style.display = 'none';
    } catch (e) { console.warn('cc boot', e); }
  })();
  window.ccApp = S;
})();
