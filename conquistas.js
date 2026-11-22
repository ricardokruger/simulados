"use strict";

const Conquistas = (() => {
  const rules = [
    { id: "nota", name: "Escada de notas", scope: "avaliação", goal: "Tire nota 5, 6, 7, 8, 9 ou 10 nesta avaliação." },
    { id: "recorde", name: "Meu novo recorde", scope: "avaliação", goal: "Supere sua melhor nota nesta avaliação, a partir da segunda tentativa." },
    { id: "volta", name: "Dei a volta por cima", scope: "avaliação", goal: "Tire 6 ou mais depois de uma nota abaixo de 5 nesta avaliação." },
    { id: "dominio", name: "Dominei o tópico", scope: "tópico", goal: "Pratique ao menos 10 questões diferentes do tópico e acerte pelo menos 8 delas por inteiro." },
    { id: "revisao", name: "Aprendi com a revisão", scope: "tópico", goal: "Marque um erro como revisado e, em outra tentativa, acerte por inteiro uma questão diferente do mesmo tópico." },
    { id: "media", name: "Escada de médias", scope: "matéria", goal: "Atinga média 5, 6, 7, 8, 9 ou 10 na matéria, a partir de 3 tentativas." },
    { id: "pratica", name: "Firme no ritmo", scope: "matéria", goal: "Conclua 3, 5, 10 ou 15 simulados da matéria." },
    { id: "sequencia", name: "Três boas tentativas", scope: "matéria", goal: "Tire pelo menos 7 em três tentativas consecutivas da matéria." },
    { id: "explorar", name: "Explorador do mapa", scope: "geral", goal: "Conclua simulados em 2, 3 ou 5 matérias diferentes." },
    { id: "dias", name: "Voltei a estudar", scope: "geral", goal: "Conclua simulados em 3, 5 ou 10 dias diferentes." },
  ];
  const byId = new Map(rules.map((rule, icon) => [rule.id, { ...rule, icon }]));
  const statuses = [
    { count: 0, name: "Mochileiro", gear: "Mochila" },
    { count: 2, name: "Trilheiro", gear: "Mapa" },
    { count: 5, name: "Explorador", gear: "Bússola" },
    { count: 9, name: "Guia de trilha", gear: "Estandarte" },
    { count: 13, name: "Cartógrafo", gear: "Equipamento de cartografia" },
  ];
  const grades = [5, 6, 7, 8, 9, 10];
  const milestones = [3, 5, 10, 15];
  const calendar = new Intl.DateTimeFormat("pt-BR");

  function threshold(values, value) {
    return values.findLast(goal => goal <= value) ?? 0;
  }

  function avatar(count) {
    const index = statuses.findLastIndex(status => status.count <= count);
    return { ...statuses[index], index, next: statuses[index + 1] };
  }

  function valueLabel(badge, format) {
    if (badge.id === "recorde") return "Nota " + format(badge.value / 5);
    if (badge.id === "nota") return "Nota " + badge.value;
    if (badge.id === "media") return "Média " + badge.value;
    if (badge.id === "pratica") return badge.value + " simulados";
    if (badge.id === "explorar") return badge.value + " matérias";
    if (badge.id === "dias") return badge.value + " dias de estudo";
    if (badge.id === "dominio") return "8 acertos em questões distintas";
    return "";
  }

  function calculate(records) {
    const badges = new Map();
    const events = new Map();
    const exams = new Map();
    const subjects = new Map();
    const topics = new Map();
    const days = new Set();
    const seen = new Set();

    for (const { entry, attempt, time } of records) {
      const eventId = JSON.stringify([entry.id, attempt.id]);
      if (seen.has(eventId)) continue;
      seen.add(eventId);
      const score = attempt.units / 5;
      const before = avatar(badges.size);
      const changes = new Map();
      const examLabel = entry.subject + " · " + entry.title;
      const exam = exams.get(entry.id) ?? { best: -1, low: false };
      const subject = subjects.get(entry.subjectId) ?? { count: 0, total: 0, streak: 0 };
      exams.set(entry.id, exam);
      subjects.set(entry.subjectId, subject);
      days.add(calendar.format(time));

      function award(id, scopeKey, label, value) {
        if (!value) return;
        const key = JSON.stringify([id, scopeKey]);
        const previous = badges.get(key);
        if (previous && previous.value >= value) return;
        const badge = { ...byId.get(id), key, label, value, isNew: !previous };
        badges.set(key, badge);
        changes.set(key, badge);
      }

      if (exam.best >= 0 && attempt.units > exam.best) award("recorde", entry.id, examLabel, attempt.units);
      if (exam.low && score >= 6) award("volta", entry.id, examLabel, 1);
      award("nota", entry.id, examLabel, threshold(grades, score));
      exam.low ||= score < 5;
      exam.best = Math.max(exam.best, attempt.units);

      subject.count++;
      subject.total += attempt.units;
      subject.streak = score >= 7 ? subject.streak + 1 : 0;
      if (subject.streak >= 3) award("sequencia", entry.subjectId, entry.subject, 1);
      if (subject.count >= 3) {
        award("media", entry.subjectId, entry.subject, threshold(grades, subject.total / (5 * subject.count)));
      }
      award("pratica", entry.subjectId, entry.subject, threshold(milestones, subject.count));
      award("explorar", "", "", threshold([2, 3, 5], subjects.size));
      award("dias", "", "", threshold([3, 5, 10], days.size));

      for (const [index, question] of (attempt.questions ?? []).entries()) {
        const result = attempt.results?.[index];
        const title = attempt.topics?.[question.topic] ?? entry.legacyTopics?.[question.topic];
        if (!result || typeof title !== "string" || !title.trim()) continue;
        const topicId = JSON.stringify([entry.subjectId, title.trim().normalize("NFC").toLocaleLowerCase("pt-BR")]);
        const questionId = JSON.stringify([entry.id, question.id]);
        const topic = topics.get(topicId) ?? { seen: new Set(), solved: new Set(), reviewed: new Map() };
        const topicLabel = entry.subject + " · " + title;
        topics.set(topicId, topic);
        topic.seen.add(questionId);

        if (result.units === 5) {
          topic.solved.add(questionId);
          const revised = [...topic.reviewed].some(([id, reviewedAt]) => id !== questionId && reviewedAt <= time);
          if (revised) award("revisao", topicId, topicLabel, 1);
        } else {
          const reviewedAt = Date.parse(attempt.reviewedQuestions?.[question.id]);
          if (Number.isFinite(reviewedAt) && reviewedAt >= time) {
            topic.reviewed.set(questionId, Math.min(reviewedAt, topic.reviewed.get(questionId) ?? Infinity));
          }
        }
        if (topic.seen.size >= 10 && topic.solved.size >= 8) award("dominio", topicId, topicLabel, 1);
      }

      const after = avatar(badges.size);
      events.set(eventId, { changes: [...changes.values()], before, after, count: badges.size });
    }
    return { badges: [...badges.values()], events, avatar: avatar(badges.size) };
  }

  return { rules, calculate, avatar, valueLabel };
})();

if (typeof module !== "undefined") module.exports = Conquistas;
