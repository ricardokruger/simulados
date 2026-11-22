"use strict";

const Simulado = (() => {
  const formats = ["choice", "boolean", "fill", "match", "crossword"];
  const levels = ["easy", "medium", "challenge"];
  const limits = [3, 5, 2];
  const ZERO = [0, 0, 0];

  function shuffle(entries, random = Math.random) {
    const result = [...entries];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function signature(questions) {
    return questions.map(q => q.id).sort().join("|");
  }

  function traits(q, topicCount) {
    const topic = 1 << q.topic;
    const format = 1 << (topicCount + formats.indexOf(q.type));
    const visual = (q.diagram || q.image) ? 1 << (topicCount + formats.length) : 0;
    const reading = q.passage ? 1 << (topicCount + formats.length + 1) : 0;
    return topic | format | visual | reading;
  }

  function selectQuestions(bank, history, random = Math.random) {
    const recent = history.slice(0, 15);
    const previous = new Set(recent.map(attempt => signature(attempt.questions)));
    const lastSeen = new Map();
    history.forEach((attempt, age) => {
      attempt.questions.forEach(q => {
        if (!lastSeen.has(q.id)) lastSeen.set(q.id, age);
      });
    });
    const candidates = shuffle(bank.questions, random).sort((left, right) =>
      (lastSeen.get(right.id) ?? Infinity) - (lastSeen.get(left.id) ?? Infinity)
    );
    const n = candidates.length;
    const full = (1 << (bank.topics.length + formats.length + 2)) - 1;
    const topicMask = (1 << bank.topics.length) - 1;
    const masks = candidates.map(q => traits(q, bank.topics.length));
    const difficulty = candidates.map(q => levels.indexOf(q.difficulty));
    const remainingTraits = Array(n + 1).fill(0);
    const remainingLevels = Array.from({ length: n + 1 }, () => [...ZERO]);
    for (let i = n - 1; i >= 0; i--) {
      remainingTraits[i] = remainingTraits[i + 1] | masks[i];
      remainingLevels[i] = [...remainingLevels[i + 1]];
      remainingLevels[i][difficulty[i]]++;
    }

    function pick(required, excludePrevious) {
      const picked = [];
      const slots = [...limits];
      function search(start, count, found) {
        if (count === 10) {
          return (found & required) === required &&
            (!excludePrevious || !previous.has(signature(picked)));
        }
        if (n - start < 10 - count ||
            ((found | remainingTraits[start]) & required) !== required ||
            slots.some((needed, level) => needed > remainingLevels[start][level])) {
          return false;
        }
        for (let i = start; i <= n - (10 - count); i++) {
          const level = difficulty[i];
          if (slots[level] === 0) continue;
          slots[level]--;
          picked.push(candidates[i]);
          if (search(i + 1, count + 1, found | masks[i])) return true;
          picked.pop();
          slots[level]++;
        }
        return false;
      }
      return search(0, 0, 0) ? picked : null;
    }

    if (n < 10 || (remainingTraits[0] & topicMask) !== topicMask) {
      throw new Error("O banco precisa de pelo menos 10 questões e deve cobrir todos os tópicos cadastrados.");
    }
    const varied = pick(full, true) ?? pick(topicMask, true);
    const chosen = varied ?? pick(full, false) ?? pick(topicMask, false);
    if (!chosen) throw new Error("O banco não tem questões suficientes por nível para montar a prova.");

    return {
      limited: !varied && previous.size === 1,
      questions: shuffle(chosen, random).sort((left, right) =>
        levels.indexOf(left.difficulty) - levels.indexOf(right.difficulty)
      ).map(q => ({
        ...q,
        ...(q.options ? { options: shuffle(q.options, random) } : {}),
        items: q.items.map(item => item.options
          ? { ...item, options: shuffle(item.options, random) }
          : item),
      })),
    };
  }

  function normalizeWord(value) {
    return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .toUpperCase().trim();
  }

  function integerDigits(value) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(value)) return null;
    const digits = value.replaceAll(".", "");
    return digits.length <= 30 ? digits : null;
  }

  function rational(value) {
    let clean = String(value ?? "").trim().replace(/−/g, "-");
    const sign = clean.startsWith("-") ? -1n : 1n;
    if (/^[+-]/.test(clean)) clean = clean.slice(1);
    const [numerator, denominator, extra] = clean.split("/");
    if (extra !== undefined) return null;
    if (denominator !== undefined) {
      const top = integerDigits(numerator.trim());
      const bottom = integerDigits(denominator.trim());
      if (top === null || bottom === null || BigInt(bottom) === 0n) return null;
      return [sign * BigInt(top), BigInt(bottom)];
    }

    const [whole, fraction, extraDecimal] = clean.split(",");
    const digits = integerDigits(whole);
    if (digits === null || extraDecimal !== undefined ||
        (fraction !== undefined && !/^\d{1,30}$/.test(fraction))) return null;
    return [
      sign * BigInt(digits + (fraction ?? "")),
      10n ** BigInt(fraction?.length ?? 0),
    ];
  }

  function groupInteger(value) {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function brazilianText(value) {
    return value.replace(/(?<![\p{L}\p{N}.,])(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d{4,})(?:,\d+)?(?![\p{L}\p{N}]|[.,]\d)/gu,
      match => {
        const [whole, fraction] = match.split(",");
        const grouped = groupInteger(whole.replace(/\s/g, ""));
        return fraction === undefined ? grouped : grouped + "," + fraction;
      });
  }

  function brazilianAnswer(value) {
    if (rational(value) === null) return value;
    return value.trim().split("/").map(part => brazilianText(part.trim())).join("/");
  }

  function legacyDecimal(value) {
    const text = String(value ?? "");
    return /^[+−-]?\d+\.\d+$/.test(text.trim()) ? text.replace(".", ",") : text;
  }

  function equivalent(given, expected) {
    const a = rational(given);
    const b = rational(expected);
    return a !== null && b !== null && a[0] * b[1] === a[1] * b[0];
  }

  function answerFor(q, answers, item) {
    if (q.type === "crossword") return item.cells.map(cell => answers[cell] ?? "").join("");
    return answers[item.id] ?? "";
  }

  function complete(q, answers = {}) {
    if (q.type === "crossword") {
      return q.items.every(item => item.cells.every(cell => Boolean(answers[cell])));
    }
    const values = q.items.map(item => String(answers[item.id] ?? "").trim());
    return values.every(Boolean) &&
      (q.type !== "match" || new Set(values).size === values.length);
  }

  function displayValue(q, item, value) {
    if (q.type === "boolean") return { V: "Verdadeiro", F: "Falso" }[value] ?? "";
    const options = item.options ?? q.options;
    return options ? options.find(option => option.id === value)?.label ?? "" : value;
  }

  function grade(question, answers = {}) {
    const parts = question.items.map(item => {
      const answer = answerFor(question, answers, item);
      let correct = answer === item.answer;
      if (question.type === "fill") {
        const word = value => String(value ?? "").trim().replace(/\s+/g, " ").normalize("NFC").toLocaleLowerCase("pt-BR");
        correct = [item.answer, ...(item.accepted ?? [])].some(expected =>
          rational(expected) ? equivalent(answer, expected) : word(answer) === word(expected));
      }
      if (question.type === "crossword") correct = normalizeWord(answer) === normalizeWord(item.answer);
      return {
        label: item.label,
        given: displayValue(question, item, answer),
        correct,
        expected: displayValue(question, item, item.answer),
        why: item.why,
      };
    });
    const units = parts.filter(part => part.correct).length * (question.type === "choice" ? 5 : 1);
    return { units, parts };
  }

  return { selectQuestions, signature, normalizeWord, equivalent, complete, grade,
    brazilianText, brazilianAnswer, legacyDecimal, isNumeric: value => rational(value) !== null };
})();

if (typeof module !== "undefined") module.exports = Simulado;
