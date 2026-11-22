"use strict";

const filters = { subject: "", from: "", to: "" };
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
const yearDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const colors = ["#266846", "#205ca2", "#983b27", "#6b427b", "#705319", "#176077"];
const markers = ["●", "◆", "■", "▲", "○", "◇"];
let chartObserver;

function disconnectChart() {
  chartObserver?.disconnect();
  chartObserver = undefined;
}

function link(label, href, theme = "outline") {
  return make("a", { textContent: label, href, className: "button " + theme });
}

function quizPath(entry) {
  return "#/simulado/" + entry.id;
}

function reviewPath(entry, attempt) {
  return quizPath(entry) + "/revisao/" + attempt.id;
}

function art(name, className) {
  const inline = inlineData?.art?.[name];
  return make("img", { alt: "", className, src: inline ?? "./arte/" + name + ".png" });
}

function renderDashboard(focus = true) {
  const available = new Map(catalog.map(entry => [entry.subjectId, entry.subject]));
  const subject = make("select", { id: "subject-filter" },
    make("option", { value: "", textContent: "Todas" }),
    [...available.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
      .map(([id, label]) => make("option", { value: id, textContent: label })));
  subject.value = filters.subject;
  const from = make("input", { type: "date", id: "date-from", value: filters.from });
  const to = make("input", { type: "date", id: "date-to", value: filters.to });
  from.setAttribute("aria-describedby", "date-hint");
  to.setAttribute("aria-describedby", "date-hint");
  const validation = make("p", { id: "date-error", className: "filter-error", hidden: true });
  validation.setAttribute("role", "status");
  const results = make("div", { className: "dashboard-results" });
  const clear = button("Limpar filtros", () => {
    subject.value = from.value = to.value = "";
    refresh();
    subject.focus();
  });
  function refresh() {
    filters.subject = subject.value;
    filters.from = from.value;
    filters.to = to.value;
    const invalid = Boolean(filters.from && filters.to && filters.from > filters.to);
    validation.textContent = invalid ? "A data inicial deve ser igual ou anterior à final." : "";
    validation.hidden = !invalid;
    from.setAttribute("aria-invalid", String(invalid));
    to.setAttribute("aria-invalid", String(invalid));
    clear.disabled = !(filters.subject || filters.from || filters.to);
    const filtered = Catalogo.filter(catalog, filters);
    disconnectChart();
    results.replaceChildren(
      assessmentList(filtered, invalid),
      historyChart(Catalogo.attempts(filtered, readSession), catalog, invalid)
    );
  }
  subject.addEventListener("change", refresh);
  from.addEventListener("input", refresh);
  to.addEventListener("input", refresh);
  show(make("div", { className: "dashboard" },
    make("section", { className: "intro" },
      make("div", {}, text("h1", "Escolha um simulado"),
        text("p", "Escolha uma avaliação e acompanhe sua evolução a cada tentativa.", "muted")),
      art("trilha", "trail-art")),
    avatarPanel(earnedAchievements()),
    make("section", { className: "filter-section" },
      make("div", { className: "filter-bar" },
        make("label", { className: "filter" }, text("span", "Matéria"), subject),
        make("label", { className: "filter" }, text("span", "Data da prova · de"), from),
        make("label", { className: "filter" }, text("span", "Data da prova · até"), to),
        clear),
      make("p", { id: "date-hint", className: "filter-hint", textContent: "O intervalo usa a data da prova escolar." }),
      validation),
    results), true, focus);
  refresh();
}

function assessmentList(entries, invalid) {
  const section = make("section", { className: "dashboard-section" }, text("h2", "Últimas avaliações"));
  if (!entries.length) {
    section.append(text("p", invalid ? "Ajuste as datas para ver as avaliações." :
      "Nenhuma avaliação encontrada com esses filtros.", "empty-state"));
    return section;
  }
  const list = make("ul", { className: "assessment-list" });
  for (const entry of entries) {
    const active = readSession(entry.id).active;
    const icon = entry.subjectId === "matematica" ? art("regua", "subject-icon") :
      text("span", entry.subject.slice(0, 1), "subject-icon subject-letter");
    icon.setAttribute("aria-hidden", "true");
    const action = link(active ? "Continuar" : "Começar", quizPath(entry), "primary");
    action.setAttribute("aria-label", (active ? "Continuar " : "Começar ") + entry.subject + " · " + entry.title);
    list.append(make("li", { className: "assessment" }, icon,
      make("div", { className: "assessment-details" },
        text("h3", entry.subject), text("p", entry.title),
        text("div", entry.grade + " · " + Catalogo.periodLabel(entry), "muted"),
        active ? text("div", countComplete(active) + " de 10 respondidas", "resume-status") : null),
      action));
  }
  section.append(list);
  return section;
}

function historyChart(records, allEntries, invalid) {
  const heading = text("h2", "Evolução das notas");
  const section = make("section", { className: "dashboard-section evolution" }, heading);
  if (!records.length) {
    section.append(make("div", { className: "empty-chart" },
      text("strong", invalid ? "Intervalo inválido" : "Sem tentativas concluídas"),
      text("p", invalid ? "Ajuste o intervalo para ver as notas." :
        "As notas das avaliações selecionadas aparecem aqui depois que você finaliza um simulado.", "muted")));
    return section;
  }
  const subjectOrder = [...new Set(allEntries.map(entry => entry.subjectId))].sort();
  const seriesMap = new Map();
  for (const record of records) {
    const { subject, subjectId } = record.entry;
    if (!seriesMap.has(subjectId)) {
      const index = subjectOrder.indexOf(subjectId);
      seriesMap.set(subjectId, { subject, color: colors[index % colors.length],
        marker: markers[index % markers.length], index, records: [] });
    }
    seriesMap.get(subjectId).records.push(record);
  }
  const series = [...seriesMap.values()].sort((a, b) => a.index - b.index);
  const caption = "Notas de 0 a 10 por data da tentativa";
  const canvas = make("canvas", { className: "score-plot", width: 700, height: 235, textContent: caption });
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", caption + ". Os valores estão na tabela abaixo do gráfico.");
  const legend = make("ul", { className: "legend" }, series.map(s => {
    const dot = text("span", s.marker, "legend-marker");
    dot.style.color = s.color;
    dot.setAttribute("aria-hidden", "true");
    return make("li", {}, dot, text("span", s.subject));
  }));

  const header = make("thead", {}, make("tr", {},
    ["Tentativa", "Matéria", "Avaliação", "Nota", "Revisão"].map(label => make("th", { scope: "col", textContent: label }))));
  const body = make("tbody", {}, [...records].reverse().map(record => {
    const { entry, attempt, time, score } = record;
    const review = link("Ver revisão", reviewPath(entry, attempt), "compact");
    review.setAttribute("aria-label", "Ver revisão de " + entry.subject + ", tentativa de " + date.format(time));
    return make("tr", {}, text("td", date.format(time)), text("td", entry.subject),
      make("td", {}, text("div", entry.title), text("small", Catalogo.periodLabel(entry), "muted")),
      text("td", points.format(score)), make("td", {}, review));
  }));
  section.append(text("p", caption, "muted"), canvas, legend,
    make("details", { className: "history-details" }, text("summary", "Ver tentativas e revisões"),
      make("div", { className: "table-scroll" }, make("table", { className: "attempt-table" }, header, body))));

  function draw() { drawChart(canvas, series, records[0].time, records.at(-1).time); }
  draw();
  if (typeof ResizeObserver !== "undefined") {
    chartObserver = new ResizeObserver(draw);
    chartObserver.observe(canvas);
  }
  return section;
}

function drawChart(canvas, series, first, last) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = canvas.clientWidth || 700;
  const height = width < 430 ? 195 : 235;
  const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.height = height + "px";
  ctx.scale(ratio, ratio);
  const left = 37, right = width - 30, top = 15, bottom = height - 30;
  const y = score => bottom - (bottom - top) * score / 10;
  const x = time => first === last ? (left + right) / 2 :
    left + (right - left) * (time - first) / (last - first);

  function stroke(coordinates, color, weight, dash = []) {
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(...coordinates[0]);
    for (const pair of coordinates.slice(1)) ctx.lineTo(...pair);
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.stroke();
  }

  ctx.font = "12px system-ui";
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.fillStyle = "#253b4f";
  for (const score of [0, 2, 4, 6, 8, 10]) {
    stroke([[left, y(score)], [right, y(score)]], score === 0 ? "#859297" : "#dbd8ca", 1);
    ctx.fillText(String(score), left - 8, y(score));
  }
  ctx.textAlign = "center";
  const format = new Date(first).getFullYear() === new Date(last).getFullYear() ? shortDate : yearDate;
  const tickCount = width < 440 ? 3 : 5;
  const sameDay = yearDate.format(first) === yearDate.format(last);
  if (first === last || sameDay) {
    ctx.fillText(format.format(first), (left + right) / 2, bottom + 17);
  } else {
    const ticks = Array.from({ length: tickCount }, (_, i) => first + (last - first) * i / (tickCount - 1));
    const shown = new Set();
    for (const tick of ticks) {
      const label = format.format(tick);
      if (!shown.has(label)) ctx.fillText(label, x(tick), bottom + 17);
      shown.add(label);
    }
  }

  const dashes = [[], [7, 4], [2, 4], [9, 4, 2, 4]];
  for (const { color, marker, index, records } of series) {
    const coordinates = records.map(record => [x(record.time), y(record.score)]);
    if (coordinates.length > 1) stroke(coordinates, color, 2.5, dashes[index % dashes.length]);
    ctx.fillStyle = color;
    ctx.font = "700 15px system-ui";
    for (const point of coordinates) ctx.fillText(marker, ...point);
  }
}
