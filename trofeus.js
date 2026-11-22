"use strict";

function earnedAchievements() {
  return Conquistas.calculate(Catalogo.attempts(catalog, readSession));
}

// Silhuetas próprias em uma grade de 7 por 7.
const voxelMarks = [
  [".....##", ".....#+", "...####", "...#+++", ".######", ".#+++++", "#######"],
  ["...#...", "..###..", ".####+.", "...#+..", "...#+..", "...#+..", "..###.."],
  ["..##...", ".####..", "##..#+.", "....#+.", "....#+.", ".#..#+.", ".####+."],
  ["...#...", "..#+#..", ".#+++#.", "#++#++#", ".#+++#.", "..#+#..", "...#..."],
  [".......", ".....+#", "....+#.", "#..+#..", ".#+#...", "..#....", "......."],
  [".......", ".....##", ".....#+", "..##.#+", "..#+.#+", "###+.#+", "#######"],
  ["..####.", ".#++++#", "####+##", "#+++###", "######.", "#++++#.", "######."],
  [".......", "#..#..#", "#..#..#", "+++++++", "#..#..#", "#..#..#", "......."],
  ["...#...", "..#+#..", ".#+#.#.", "#.###.#", ".#.#.#.", "..#+#..", "...#..."],
  [".#...#.", "#######", "#+++++#", "#.#.#.#", "#...#.#", "#.....#", "#######"],
];

function voxelBadge(index) {
  const block = make("span", { className: "voxel-badge" });
  block.setAttribute("data-badge", String(index));
  const mark = make("span", { className: "voxel-mark" });
  const pixels = [];
  voxelMarks[index].forEach((row, y) => {
    [...row].forEach((pixel, x) => {
      if (pixel !== ".") pixels.push(x + "em " + y + "em var(--mark-" + (pixel === "+" ? "light" : "ink") + ")");
    });
  });
  mark.style.boxShadow = pixels.join(", ");
  block.append(mark);
  return block;
}

function voxelAvatar(stage) {
  const figure = make("span", { className: "voxel-avatar" });
  figure.setAttribute("data-stage", String(stage));
  for (const part of ["pack", "leg-left", "leg-right", "arm-left", "arm-right", "coat", "head", "hair"]) {
    figure.append(make("span", { className: "voxel-part voxel-" + part }));
  }
  for (const gear of ["map", "compass", "flag", "tools"].slice(0, stage)) {
    figure.append(make("span", { className: "voxel-part voxel-" + gear }));
  }
  return figure;
}

function sprite(sheet, sourceWidth, sourceHeight, left, top, width, height, alternate, voxel) {
  const frame = make("span", { className: "sprite-frame" });
  frame.style.setProperty("--sprite-ratio", width + " / " + height);
  frame.setAttribute("aria-hidden", "true");
  const img = art(sheet, "sprite-image");
  img.style.width = 100 * sourceWidth / width + "%";
  img.style.height = 100 * sourceHeight / height + "%";
  img.style.left = -100 * left / width + "%";
  img.style.top = -100 * top / height + "%";
  frame.append(img, text("span", alternate, "classic-emblem"), voxel);
  return frame;
}

function badgeSprite(index) {
  const row = index < 5 ? 24 : 398;
  return sprite("emblemas", 1983, 793, [38, 427, 812, 1190, 1560][index % 5], row, 355, 310, ["↗", "★", "↶", "◇", "✓", "≡", "▤", "⋯", "⌖", "▦"][index], voxelBadge(index));
}

function avatarSprite(index) {
  return sprite("cartografo", 1774, 887, [16, 364, 699, 1045, 1402][index], 97, 330, 647, String(index + 1), voxelAvatar(index));
}

function avatarGoal(status, count) {
  if (!status.next) return "Você completou o equipamento de cartografia.";
  const left = status.next.count - count;
  return (left === 1 ? "Mais 1 conquista" : "Mais " + left + " conquistas") +
    " para ganhar: " + status.next.gear + ".";
}

function avatarPanel(data, detailed = false) {
  const counts = data.badges.length;
  const status = data.avatar;
  return make("section", { className: "avatar-panel" }, avatarSprite(status.index),
    make("div", {}, text("h2", status.name),
      text("p", counts === 1 ? "1 conquista" : points.format(counts) + " conquistas", "avatar-count"),
      text("p", avatarGoal(status, counts), "muted"),
      detailed ? null : link("Ver conquistas", "#/conquistas")));
}

function badgeCard(badge, muted = false) {
  const level = muted ? "" : Conquistas.valueLabel(badge, value => points.format(value));
  return make("article", { className: "badge-card" + (muted ? " badge-guide" : "") },
    badgeSprite(badge.icon),
    make("div", {}, text("h3", badge.name),
      badge.label ? text("p", badge.label, "muted") : null,
      level ? text("p", level, "badge-level") : null,
      !muted ? null : text("p", badge.goal)));
}

function renderAchievements() {
  const data = earnedAchievements();
  const groups = [];
  for (const scope of ["geral", "matéria", "avaliação", "tópico"]) {
    const badges = data.badges.filter(badge => badge.scope === scope);
    if (!badges.length) continue;
    groups.push(make("section", { className: "trophy-section" },
      text("h2", scope === "geral" ? "Gerais" : "Por " + scope),
      make("div", { className: "badge-grid" }, badges.map(badge => badgeCard(badge)))));
  }
  const guide = make("details", { className: "trophy-guide", open: !data.badges.length },
    text("summary", "Como desbloquear conquistas"),
    make("div", { className: "badge-grid" }, Conquistas.rules.map((rule, icon) => badgeCard({ ...rule, icon }, true))));
  show(make("div", { className: "dashboard trophy-page" },
    text("h1", "Conquistas"), avatarPanel(data, true),
    groups.length ? groups : text("p", "Suas medalhas aparecem aqui conforme você conclui os simulados.", "muted"),
    guide));
}

function resultAchievements(attempt) {
  const event = earnedAchievements().events.get(JSON.stringify([entry.id, attempt.id]));
  if (!event) return {};
  const { changes, before, after, count } = event;
  const section = make("section", { className: "section result-badges" },
    text("h2", changes.length ? "Conquistas desta tentativa" : "Próxima meta"),
    changes.length ? make("div", { className: "badge-grid" },
      changes.map(badge => badgeCard(badge))) : null,
    make("div", { className: "result-avatar" }, avatarSprite(after.index),
      make("div", {},
        text("strong", after.name),
        text("p", avatarGoal(after, count), "muted"))),
    link("Ver todas as conquistas", "#/conquistas"));
  return { section, event };
}

function celebrateAchievements(event) {
  if (!event?.changes.length) return;
  const chosen = event.changes.find(badge => badge.isNew) ?? event.changes[0];
  const extra = event.changes.length - 1;
  const dialog = make("dialog", { className: "celebration" });
  dialog.setAttribute("aria-labelledby", "celebration-title");
  const artLayer = make("div", { className: "pixel-fireworks" });
  artLayer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 24; i++) {
    const particle = make("span", { className: "firework-pixel" });
    const rad = i % 8 * Math.PI / 4;
    const distance = 23 + (i % 3) * 13;
    particle.style.setProperty("--spark-x", Math.round(Math.cos(rad) * distance) + "px");
    particle.style.setProperty("--spark-y", Math.round(Math.sin(rad) * distance) + "px");
    particle.style.setProperty("--burst", (i < 8 ? "18%" : i < 16 ? "82%" : "51%"));
    particle.style.setProperty("--spark-delay", (Math.floor(i / 8) * 160) + "ms");
    particle.style.setProperty("--spark-color", ["#bd4d2f", "#327853", "#b87710", "#20538c"][i % 4]);
    artLayer.append(particle);
  }
  const title = text("h2", chosen.isNew ? "Conquista desbloqueada!" : "Conquista melhorada!");
  title.id = "celebration-title";
  dialog.append(artLayer, title, badgeCard(chosen));
  if (extra) dialog.append(text("p", "Também houve " + (extra === 1 ? "mais 1 conquista" : "mais " + extra + " conquistas") +
    " nesta tentativa.", "muted"));
  if (event.before.index !== event.after.index) dialog.append(text("p", "Novo status: " + event.after.name, "avatar-count"));
  dialog.append(button("Continuar para a revisão", () => dialog.close(), "primary"));
  dialog.addEventListener("close", () => {
    dialog.remove();
    app.querySelector("h1")?.focus();
  }, { once: true });
  document.body.append(dialog);
  dialog.showModal();
}
