"use strict";

const app = document.querySelector("#app");
const home = document.querySelector("#home");
const notice = document.querySelector("#notice");
const scratchWidth = 13;
const scratchHeight = 8;
const booleanOptions = [{ id: "V", label: "Verdadeiro" }, { id: "F", label: "Falso" }];
const points = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
let bank;
let key;
let session = { active: null, history: [] };

function make(tag, properties = {}, ...children) {
  const element = document.createElement(tag);
  Object.assign(element, properties);
  for (const child of children.flat()) {
    if (child !== null && child !== undefined) element.append(child);
  }
  return element;
}

function button(label, action, theme = "outline") {
  const control = make("button", { textContent: label, type: "button", className: "button " + theme });
  control.addEventListener("click", action);
  return control;
}

function text(tag, value, className = "") {
  return make(tag, { className, textContent: value });
}

function alertMessage(value) {
  notice.textContent = value;
  notice.hidden = !value;
}

function save(nextSession = session) {
  try {
    localStorage.setItem(key, JSON.stringify(nextSession));
    session = nextSession;
    alertMessage("");
    return true;
  } catch {
    alertMessage("O navegador não conseguiu salvar. Sua tentativa continua aberta. Libere espaço ou permita o armazenamento e tente novamente.");
    return false;
  }
}

function show(content, mainPage = false, focus = true) {
  home.hidden = mainPage;
  app.setAttribute("aria-busy", "false");
  app.replaceChildren(content);
  if (focus) {
    const heading = app.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }
}

function start() {
  try {
    const selection = Simulado.selectQuestions(bank, session.history);
    session.active = {
      id: globalThis.crypto?.randomUUID?.() ?? Date.now() + "-" + Math.random().toString(36).slice(2),
      bankVersion: bank.version,
      position: 0,
      questions: selection.questions,
      answers: {},
      scratch: {},
    };
    save();
    if (selection.limited) alertMessage("O banco oferece apenas um conjunto disponível para a seleção atual.");
    renderQuestion();
  } catch (error) {
    alertMessage(error.message);
  }
}

function renderHome(focus = true) {
  const active = session.active;
  const hero = make("section", { className: "hero" },
    text("h1", "Simulado de Matemática"),
    text("p", "Resolva 10 questões com os seis tópicos da avaliação. Use a folha quadriculada para fazer as contas e confira a resolução depois de finalizar."),
    active
      ? button("Continuar tentativa", renderQuestion, "primary")
      : button(session.history.length ? "Começar nova tentativa" : "Começar simulado", start, "primary"));
  if (active) hero.append(text("p", countComplete(active) + " de 10 questões respondidas", "active-progress"));
  const topics = make("section", { className: "section" },
    text("h2", "Tópicos da avaliação"),
    make("ol", { className: "topics" }, bank.topics.map(topic => text("li", topic))));
  const history = make("section", { className: "section" }, text("h2", "Histórico"));
  if (!session.history.length) {
    history.append(text("p", "As tentativas salvas aparecem aqui.", "muted"));
  } else {
    history.append(make("div", { className: "history-list" }, session.history.map(attempt =>
      make("div", { className: "history-row" },
        text("span", date.format(new Date(attempt.finishedAt)) + " · Nota " + points.format(attempt.units / 5) + " de 10"),
        button("Ver revisão", () => renderReview(attempt))))));
  }
  show(make("div", {}, hero, topics, history), true, focus);
}

function countComplete(attempt) {
  return attempt.questions.filter(q => Simulado.complete(q, attempt.answers[q.id])).length;
}

function renderQuestion() {
  const attempt = session.active;
  if (!attempt) return renderHome();
  const question = attempt.questions[attempt.position];
  const answer = attempt.answers[question.id] ??= {};
  function go(position) {
    attempt.position = position;
    save();
    renderQuestion();
  }

  const progress = make("progress", { max: 10 });
  progress.setAttribute("aria-label", "Questões respondidas");
  const count = text("span", "", "muted");
  count.setAttribute("aria-live", "polite");
  const nav = make("nav", { className: "question-nav" });
  nav.setAttribute("aria-label", "Ir para questão");
  const steps = attempt.questions.map((q, index) => {
    const step = button(String(index + 1), () => go(index));
    step.className = "step";
    if (attempt.position === index) step.setAttribute("aria-current", "step");
    nav.append(step);
    return { q, step };
  });

  const final = button("Salvar e finalizar", () => confirmFinish(attempt), "primary");
  const previous = button("Anterior", () => go(attempt.position - 1));
  previous.disabled = attempt.position === 0;
  const next = button("Próxima", () => go(attempt.position + 1));
  next.disabled = attempt.position === 9;
  function refreshProgress() {
    const value = countComplete(attempt);
    count.textContent = value + " de 10 respondidas";
    progress.value = value;
    final.disabled = value !== 10;
    steps.forEach(({ step, q }, i) => {
      const done = Simulado.complete(q, attempt.answers[q.id]);
      step.classList.toggle("done", done);
      step.setAttribute("aria-label", "Questão " + (i + 1) + (done ? ", respondida" : ", pendente"));
    });
  }

  const card = make("section", { className: "section question-card" },
    text("p", bank.topics[question.topic], "kicker"),
    text("h2", question.prompt, "question-heading"),
    question.passage ? text("p", question.passage, "passage") : null,
    question.diagram ? drawDiagram(question.diagram) : null,
    renderAnswer(question, answer, () => {
      save();
      refreshProgress();
    }),
    renderScratch(attempt, question));
  show(make("div", {},
    make("div", { className: "status" }, text("h1", "Questão " + (attempt.position + 1) + " de 10"), count),
    progress, nav, card,
    make("div", { className: "toolbar footer-actions" }, make("div", { className: "toolbar" }, previous, next), final)));
  refreshProgress();
}

function renderAnswer(q, answers, commit) {
  const form = make("div", { className: "question-form" });
  if (q.type === "crossword") return crossword(q, answers, commit, form);
  const selects = [];
  function updateSelects() {
    const used = new Set(Object.values(answers));
    selects.forEach(select => {
      [...select.options].forEach(option => {
        option.disabled = Boolean(option.value && option.value !== select.value && used.has(option.value));
      });
    });
  }
  q.items.forEach((item, i) => {
    const value = answers[item.id] ?? "";
    const number = (i + 1) + ". ";
    function update(chosen) {
      answers[item.id] = chosen;
      if (q.type === "match") updateSelects();
      commit();
    }

    if (q.type === "choice" || q.type === "boolean") {
      const options = item.options ?? booleanOptions;
      const group = q.type === "boolean"
        ? make("fieldset", { className: "boolean" }, text("legend", number + item.label))
        : form;
      for (const option of options) {
        const radio = make("input", { type: "radio", name: q.id + "-" + item.id,
          value: option.id, checked: value === option.id });
        radio.addEventListener("change", () => update(radio.value));
        group.append(make("label", { className: "choice" }, radio, text("span", option.label)));
      }
      if (group !== form) form.append(group);
      return;
    }

    let field;
    if (q.type === "match") {
      field = make("select", {},
        make("option", { value: "", textContent: "Selecione" }),
        q.options.map(option => make("option", { value: option.id, textContent: option.label })));
      field.value = value;
      selects.push(field);
      field.addEventListener("change", () => update(field.value));
    } else {
      field = make("input", { value, type: "text", maxLength: 24, autocomplete: "off", spellcheck: false });
      field.addEventListener("input", () => update(field.value));
    }
    form.append(make("label", { className: "short-answer" }, text("span", number + item.label), field));
  });
  updateSelects();
  return form;
}

function crossword(q, answers, commit, form) {
  const grid = make("div", { className: "cross-grid" });
  const clues = make("div", { className: "cross-clues" });
  const cells = new Map();
  const fields = new Map();
  let direction = null;
  for (const [index, item] of q.items.entries()) {
    for (const cell of item.cells) {
      if (!cells.has(cell)) cells.set(cell, []);
      cells.get(cell).push(item);
    }
    const axis = item.cells[0].split(",")[0] === item.cells[1].split(",")[0] ? "Horizontal" : "Vertical";
    clues.append(button((index + 1) + ". " + axis + " · " + item.label, () => {
      direction = item;
      const first = item.cells.find(cell => !answers[cell]) ?? item.cells[0];
      fields.get(first).focus();
    }));
  }
  const cols = Math.max(...[...cells.keys()].map(cell => +cell.split(",")[1])) + 1;
  grid.style.setProperty("--square", "clamp(1.28rem, 5.5vw, 1.85rem)");
  function related(cell) {
    const matching = cells.get(cell);
    if (!matching.includes(direction)) direction = matching[0];
    return direction.cells;
  }
  [...cells.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR", { numeric: true }))
    .forEach(([cell, matches]) => {
      const [row, col] = cell.split(",").map(Number);
      const rectangle = make("span", { className: "cross-cell" });
      rectangle.style.gridRow = String(row + 1);
      rectangle.style.gridColumn = String(col + 1);
      const origin = matches.filter(item => item.cells[0] === cell);
      if (origin.length) rectangle.append(text("small", origin.map(item => q.items.indexOf(item) + 1).join("/")));
      const field = make("input", { type: "text", maxLength: 1, value: answers[cell] ?? "",
        autocomplete: "off", spellcheck: false, className: "cross-input" });
      field.setAttribute("aria-label", "Letra da linha " + (row + 1) + ", coluna " + (col + 1));
      field.addEventListener("focus", () => { related(cell); field.select(); });
      field.addEventListener("input", () => {
        field.value = Simulado.normalizeWord(field.value).replace(/[^A-Z]/g, "").slice(-1);
        answers[cell] = field.value;
        commit();
        const word = related(cell);
        if (field.value) fields.get(word[word.indexOf(cell) + 1])?.focus();
      });
      field.addEventListener("keydown", event => {
        const neighbors = {
          ArrowUp: [row - 1, col], ArrowDown: [row + 1, col],
          ArrowLeft: [row, col - 1], ArrowRight: [row, col + 1],
        };
        if (neighbors[event.key]) {
          event.preventDefault();
          const target = neighbors[event.key].join(",");
          direction = matches.find(item => item.cells.includes(target)) ?? direction;
          fields.get(target)?.focus();
        }
      });
      fields.set(cell, field);
      rectangle.append(field);
      grid.append(rectangle);
    });
  grid.style.gridTemplateColumns = "repeat(" + cols + ", var(--square))";
  form.append(text("p", "Selecione uma pista ou digite na grade. Use letras sem acento.", "muted"),
    make("div", { className: "cross-area" }, grid, clues));
  return form;
}

function scratchBoard(scratch, editable, onChange) {
  const grid = make("div", { className: "scratch-grid" });
  const scroll = make("div", { className: "scratch-scroll" }, grid);
  const fields = [];
  let selected = 0;
  const edits = [];

  function paint() {
    fields.forEach((cell, i) => {
      const value = scratch.cells[i] ?? "";
      if (editable) cell.value = value;
      else cell.textContent = value;
      cell.classList.toggle("ruled", scratch.rows.includes(Math.floor(i / scratchWidth)));
    });
  }
  function move(index) {
    if (index >= 0 && index < fields.length) fields[index].focus();
  }
  function changeCell(index, value) {
    const previous = scratch.cells[index] ?? "";
    if (value !== previous) {
      edits.push({ index, previous });
      if (value) scratch.cells[index] = value;
      else delete scratch.cells[index];
      onChange();
    }
    fields[index].value = value;
  }

  for (let i = 0; i < scratchWidth * scratchHeight; i++) {
    const row = Math.floor(i / scratchWidth);
    const col = i % scratchWidth;
    const cell = editable
      ? make("input", { type: "text", maxLength: 1, inputMode: "text", spellcheck: false, autocomplete: "off" })
      : make("span");
    if (editable) {
      cell.setAttribute("aria-label", "Rascunho, linha " + (row + 1) + ", coluna " + (col + 1));
      cell.addEventListener("focus", () => { selected = i; cell.select(); });
      cell.addEventListener("input", () => {
        const value = cell.value.replace(/[^0-9,.+\-−×x*÷/:=%()√²³]/g, "").slice(-1);
        changeCell(i, value);
        if (value && col < scratchWidth - 1) move(i + 1);
      });
      cell.addEventListener("keydown", event => {
        const target = {
          ArrowUp: i - scratchWidth, ArrowDown: i + scratchWidth,
          ArrowLeft: col > 0 ? i - 1 : i,
          ArrowRight: col < scratchWidth - 1 ? i + 1 : i,
          Enter: i + scratchWidth,
        }[event.key];
        if (target !== undefined) {
          event.preventDefault();
          move(target);
        }
      });
    }
    fields.push(cell);
    grid.append(cell);
  }
  paint();
  if (!editable) {
    scroll.setAttribute("role", "img");
    scroll.setAttribute("aria-label", Array.from({ length: scratchHeight }, (_, row) => {
      const line = fields.slice(row * scratchWidth, (row + 1) * scratchWidth)
        .map(cell => cell.textContent || " ").join("").trim();
      return line ? "Linha " + (row + 1) + ": " + line : "";
    }).filter(Boolean).join(". ") || "Rascunho sem números");
    return scroll;
  }

  const tools = make("div", { className: "toolbar scratch-tools" },
    [",", "+", "−", "×", "÷", "/", "="].map(symbol => button(symbol, () => {
      changeCell(selected, symbol);
      move(selected % scratchWidth === scratchWidth - 1 ? selected : selected + 1);
    })),
    button("Linha", () => {
      const row = Math.floor(selected / scratchWidth);
      edits.push({ rows: [...scratch.rows] });
      scratch.rows = scratch.rows.includes(row) ? scratch.rows.filter(value => value !== row) : [...scratch.rows, row];
      paint();
      onChange();
      move(selected);
    }),
    button("Apagar", () => { changeCell(selected, ""); move(selected); }),
    button("Desfazer", () => {
      const edit = edits.pop();
      if (!edit) return;
      if (edit.rows) scratch.rows = edit.rows;
      else {
        if (edit.previous) scratch.cells[edit.index] = edit.previous;
        else delete scratch.cells[edit.index];
        selected = edit.index;
      }
      paint();
      onChange();
      move(selected);
    }));
  return make("div", {}, tools, scroll);
}

function renderScratch(attempt, question) {
  const details = make("details", { className: "scratch" },
    text("summary", "Rascunho da conta"));
  details.addEventListener("toggle", () => {
    if (!details.open || details.childElementCount > 1) return;
    const scratch = attempt.scratch[question.id] ??= { cells: {}, rows: [] };
    details.append(text("p", "Selecione um quadrinho e digite. Use as setas para mover o cursor.", "muted"),
      scratchBoard(scratch, true, () => save()));
  });
  return details;
}

function confirmFinish(attempt) {
  if (countComplete(attempt) !== 10 || session.active?.id !== attempt.id) return;
  const box = make("dialog", {},
    text("h2", "Finalizar o simulado?"),
    text("p", "Após salvar, você poderá conferir a nota e as resoluções."));
  box.append(make("div", { className: "toolbar" },
    button("Voltar à prova", () => box.close()),
    button("Confirmar e salvar", () => {
      if (session.active?.id !== attempt.id) return;
      const results = attempt.questions.map(q => Simulado.grade(q, attempt.answers[q.id]));
      const finished = { ...attempt, results,
        finishedAt: new Date().toISOString(),
        units: results.reduce((sum, result) => sum + result.units, 0) };
      const next = { active: null, history: [finished, ...session.history.filter(entry => entry.id !== attempt.id)] };
      if (save(next)) {
        box.close();
        renderReview(finished);
      } else {
        box.querySelector(".save-error").hidden = false;
      }
    }, "primary")),
    make("p", { className: "save-error notice", hidden: true, textContent: "Não foi possível salvar. A prova continua aberta. Tente novamente." }));
  box.addEventListener("close", () => box.remove(), { once: true });
  document.body.append(box);
  box.showModal();
}

function renderReview(attempt) {
  const full = attempt.results.filter(result => result.units === 5).length;
  const partial = attempt.results.filter(result => result.units > 0 && result.units < 5).length;
  const body = make("div", {}, make("section", { className: "section result-title" },
    make("div", {},
      text("h1", "Sua revisão"),
      text("p", full + " acerto(s) completo(s) · " + partial + " parcial(is) · " +
        (10 - full - partial) + " sem acerto.", "muted")),
    make("div", {}, text("span", "Nota", "kicker"),
      text("div", points.format(attempt.units / 5) + " / 10", "grade"))));
  attempt.questions.forEach((q, index) => {
    const result = attempt.results[index];
    const section = make("section", { className: "section" },
      text("p", "Questão " + (index + 1) + " · " + points.format(result.units / 5) + " de 1 ponto", "kicker"),
      text("h2", q.prompt),
      q.passage ? text("p", q.passage, "passage") : null,
      q.diagram ? drawDiagram(q.diagram) : null);
    const parts = make("ol", { className: "review-list" });
    for (const part of result.parts) {
      const entry = make("li", { className: "review-item" },
        part.label ? text("b", part.label) : null,
        text("b", part.correct ? "Correto" : "Incorreto", part.correct ? "correct" : "incorrect"),
        text("div", "Sua resposta: " + part.given),
        text("div", "Gabarito: " + part.expected),
        text("div", part.why, "muted"));
      parts.append(entry);
    }
    const scratch = attempt.scratch[q.id];
    section.append(parts);
    if (scratch && (scratch.rows.length || Object.keys(scratch.cells).length)) {
      section.append(make("details", { className: "scratch", open: true },
        text("summary", "Seu rascunho"), scratchBoard(scratch, false)));
    }
    body.append(section);
  });
  body.append(button("Voltar ao início", () => renderHome(), "primary"));
  show(body);
}

home.addEventListener("click", () => renderHome());

function drawDiagram(diagram) {
  const width = 420, height = diagram.kind === "full" ? 264 : 212;
  const canvas = make("canvas", { width: width * 2, height: height * 2, className: "diagram" });
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", diagram.alt);
  canvas.textContent = diagram.alt;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  const x = 210, y = diagram.kind === "full" ? 132 : 179;
  const r = diagram.kind === "full" ? 102 : 126;
  const direction = a => a * Math.PI / 180;
  const point = (a, radius) => [x + radius * Math.cos(direction(a)), y - radius * Math.sin(direction(a))];
  function stroke(coords, color, weight = 1) {
    ctx.beginPath();
    ctx.moveTo(...coords[0]);
    coords.slice(1).forEach(pair => ctx.lineTo(...pair));
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.stroke();
  }
  function arc(from, to, radius, color, weight = 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius, -direction(to), -direction(from));
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.stroke();
  }
  function label(value, coords, size = 15) {
    ctx.font = "700 " + size + "px system-ui";
    ctx.fillStyle = "#17352a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value, ...coords);
  }
  if (diagram.kind === "protractor") {
    arc(0, 180, r, "#607a6c", 2);
    for (let i = 0; i <= 180; i += 5) {
      stroke([point(i, r), point(i, r - (i % 10 === 0 ? 10 : 5))], "#607a6c");
      if (i % 10 === 0) label(String(i) + "°", point(i, i === 0 || i === 180 ? r + 22 : r + 15), 10);
    }
    stroke([point(180, r), point(0, r)], "#9bada3");
  }
  diagram.rays.forEach(a => stroke([[x, y], point(a, r)], "#135c48", 2.6));
  if (diagram.kind === "right") {
    stroke([[x + 17, y], [x + 17, y - 17], [x, y - 17]], "#526a60", 1.5);
  }
  diagram.labels.forEach((value, i) => {
    const a = diagram.rays[i], b = diagram.rays[i + 1];
    arc(a, b, 43, "#2e826b", 1.6);
    label(value, point((a + b) / 2, 66));
  });
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#135c48";
  ctx.fill();
  return canvas;
}

async function boot() {
  try {
    const embedded = document.querySelector("#bank-data");
    if (embedded) bank = JSON.parse(embedded.textContent);
    else {
      const response = await fetch("./bancos/matematica.json");
      if (!response.ok) throw new Error("O banco retornou " + response.status + ".");
      bank = await response.json();
    }
    key = "simulados-escolares:v1:" + bank.id;
    try {
      const previous = localStorage.getItem(key);
      if (previous) session = JSON.parse(previous);
    } catch {
      alertMessage("O histórico local não pôde ser aberto neste navegador.");
    }
    renderHome(false);
  } catch {
    show(make("section", { className: "section" }, text("h1", "Não foi possível carregar o simulado"),
      text("p", "Abra o HTML autônomo ou sirva a pasta completa por HTTP. O arquivo do banco precisa estar em bancos/matematica.json.")), true);
  }
}

boot();
