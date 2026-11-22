"use strict";

const Catalogo = (() => {
  const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(value + "T00:00:00Z");
    return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value;
  }

  function validate(value) {
    if (value?.schemaVersion !== 1 || !Array.isArray(value.assessments)) {
      throw new Error("Formato do catálogo inválido.");
    }
    const ids = new Set();
    for (const entry of value.assessments) {
      if (!entry || !validId.test(entry.id || "") || ids.has(entry.id) ||
          !validId.test(entry.subjectId || "") || !entry.subject?.trim() || !entry.title?.trim() ||
          !entry.grade?.trim() || !validDate(entry.addedAt) ||
          (entry.examDate != null && !validDate(entry.examDate)) ||
          (entry.period != null && typeof entry.period !== "string") ||
          !/^\.\/bancos\/[a-z0-9-]+\.json$/.test(entry.bankPath || "")) {
        throw new Error("Cadastro de avaliação inválido ou duplicado.");
      }
      ids.add(entry.id);
    }
    return value.assessments.map((entry, index) => ({ entry, index }))
      .sort((a, b) => b.entry.addedAt.localeCompare(a.entry.addedAt) || b.index - a.index)
      .map(item => item.entry);
  }

  function filter(entries, { subject, from, to }) {
    if (from && to && from > to) return [];
    return entries.filter(entry =>
      (!subject || entry.subjectId === subject) &&
      (!from || (entry.examDate && entry.examDate >= from)) &&
      (!to || (entry.examDate && entry.examDate <= to)));
  }

  function periodLabel(entry) {
    const schoolDate = entry.examDate?.split("-").reverse().join("/");
    return [entry.period, schoolDate ? "Prova em " + schoolDate : ""].filter(Boolean).join(" · ") ||
      "Período a definir";
  }

  function attempts(entries, readSession) {
    return entries.flatMap(entry => readSession(entry.id).history.flatMap(attempt => {
      const time = Date.parse(attempt.finishedAt);
      if (!Number.isFinite(time) || !Number.isInteger(attempt.units) || attempt.units < 0 || attempt.units > 50) return [];
      return [{ entry, attempt, time, score: attempt.units / 5 }];
    })).sort((a, b) => a.time - b.time);
  }

  function route(hash) {
    if (!hash || hash === "#/" || hash === "#") return { type: "home" };
    const match = /^#\/simulado\/([a-z0-9-]+)(?:\/revisao\/([a-z0-9-]+))?$/.exec(hash);
    if (!match) return { type: "missing" };
    return { type: match[2] ? "review" : "quiz", entryId: match[1], attemptId: match[2] };
  }

  return { validate, filter, periodLabel, attempts, route };
})();

if (typeof module !== "undefined") module.exports = Catalogo;
