(() => {
  "use strict";

  const source = document.getElementById("timeline-source");
  const dialog = document.getElementById("timeline-dialog");
  if (!source || typeof dialog?.showModal !== "function" || !window.createTimelineLayout) return;

  const content = dialog.querySelector("[data-dialog-content]");
  const viewport = document.getElementById("timeline-viewport");
  const track = document.getElementById("timeline-track");
  const axis = document.getElementById("timeline-axis");
  const undated = document.getElementById("timeline-undated");
  const stage = document.getElementById("timeline-stage");
  const sticky = stage.querySelector(".timeline-sticky");
  const lanes = [...track.querySelectorAll(".timeline-lane")];
  const entries = [...source.querySelectorAll(".entry-detail")];
  const categoryNames = new Map(lanes.map(lane => [
    lane.dataset.category, lane.querySelector(".lane-label").textContent,
  ]));
  const topics = new Map([...document.querySelectorAll(".topic-key")].map(key => [
    key.querySelector(".topic-dot").dataset.topic, key,
  ]));
  const triggers = new Map();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let currentEntry = null;

  function entryTopics(entry) {
    return (entry.dataset.topics || "").split(/\s+/).filter(topic => topics.has(topic));
  }

  function makeTrigger(entry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "entry-trigger";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", dialog.id);

    const title = document.createElement("span");
    title.className = "entry-title";
    title.textContent = entry.dataset.shortTitle || entry.querySelector("h2").textContent;
    const caption = document.createElement("span");
    caption.className = "entry-caption";
    caption.append(title);
    button.append(caption);

    const tags = entryTopics(entry);
    if (tags.length) {
      const marks = document.createElement("span");
      marks.className = "topic-marks";
      marks.setAttribute("aria-hidden", "true");
      for (const topic of tags) {
        marks.append(topics.get(topic).querySelector(".topic-dot").cloneNode(true));
      }
      caption.append(marks);
      const colors = tags.map(topic => `var(--category-${topic})`);
      if (colors.length === 1) colors.push(colors[0]);
      button.style.setProperty("--topic-stops", colors.join(", "));
    }

    button.addEventListener("click", () => {
      history.pushState({ timelineEntry: entry.id }, "", "#" + entry.id);
      syncLocation();
    });
    // Bring an offscreen entry into view when tabbing through a lane.
    button.addEventListener("focus", () => {
      if (button.matches(":focus-visible") && !dialog.open) revealEntry(entry);
    });
    triggers.set(entry.id, button);
  }

  entries.forEach(makeTrigger);
  const layout = window.createTimelineLayout({
    viewport, axis,
    grid: document.getElementById("timeline-grid"), lanes, entries, triggers,
  });
  const undatedList = undated.querySelector(".month-entries");
  for (const trigger of triggers.values()) {
    if (!trigger.parentElement) undatedList.append(trigger);
  }
  undated.hidden = !undatedList.childElementCount;

  let travel = 0;
  let panStart = 0;
  let offset = 0;
  let clearLeft = 0;
  let viewWidth = 0;

  function renderScroll() {
    offset = travel - Math.max(0, Math.min(travel, window.scrollY - panStart));
    viewport.style.setProperty("--timeline-x", -offset + "px");
    layout.render(offset, clearLeft, viewWidth);
  }

  function measure() {
    const boardHeight = window.innerHeight;
    stage.style.setProperty("--board-height", boardHeight + "px");
    const widthBefore = viewport.clientWidth;
    let chartWidth = layout.measure();
    stage.classList.toggle("timeline-short", track.offsetHeight > boardHeight);
    // A vertical scrollbar in a short window can change the ruler's usable width.
    if (viewport.clientWidth !== widthBefore) chartWidth = layout.measure();
    viewWidth = viewport.clientWidth;
    clearLeft = lanes[0].querySelector(".lane-label").offsetWidth;
    travel = Math.max(0, chartWidth - viewWidth);
    viewport.style.setProperty("--chart-width", chartWidth + "px");
    const stageTop = stage.getBoundingClientRect().top + window.scrollY;
    // Let every lane enter the viewport at the newest date before panning.
    // Release the pinned plot once the oldest date has come into view.
    const extraSpace = Math.max(0, window.innerHeight - sticky.offsetHeight);
    panStart = Math.max(0, stageTop - extraSpace);
    stage.style.setProperty("--travel", Math.max(0, panStart + travel - stageTop + extraSpace) + "px");
    renderScroll();
  }

  function goToOffset(x, smooth = false) {
    const top = panStart + travel - Math.max(0, Math.min(travel, x));
    window.scrollTo({ top, behavior: smooth && !reducedMotion.matches ? "smooth" : "instant" });
    if (!smooth || reducedMotion.matches) renderScroll();
  }

  function revealEntry(entry) {
    const bounds = layout.boundsFor(entry.id);
    const trigger = triggers.get(entry.id);
    if (!bounds) {
      trigger.scrollIntoView({ block: "nearest", behavior: "instant" });
      return;
    }
    const available = viewWidth - clearLeft;
    const overlap = Math.min(bounds.right, offset + viewWidth) - Math.max(bounds.left, offset + clearLeft);
    const desired = Math.min(trigger.querySelector(".entry-caption").offsetWidth + 12, available, bounds.right - bounds.left);
    if (overlap < desired - 1) {
      goToOffset((bounds.left + bounds.right - clearLeft - viewWidth) / 2);
    }
    if (stage.classList.contains("timeline-short")) {
      const bar = trigger.getBoundingClientRect();
      const frame = viewport.getBoundingClientRect();
      const top = frame.top + axis.offsetHeight;
      if (bar.top < top) viewport.scrollTop += bar.top - top;
      else if (bar.bottom > frame.bottom) viewport.scrollTop += bar.bottom - frame.bottom;
    }
  }

  function step(direction) {
    goToOffset(offset + direction * (viewWidth - clearLeft) * 0.8, true);
  }

  function openEntry(entry) {
    if (currentEntry === entry && dialog.open) return;
    revealEntry(entry);
    const category = document.createElement("p");
    category.className = "detail-category";
    category.textContent = categoryNames.get(entry.dataset.category);
    const body = entry.cloneNode(true);
    const heading = body.querySelector("h2");
    heading.id = "timeline-detail-title";
    const labels = document.createElement("div");
    labels.className = "detail-topics";
    for (const topic of entryTopics(entry)) {
      labels.append(topics.get(topic).cloneNode(true));
    }
    if (labels.childElementCount) (body.querySelector(".entry-date") || heading).after(labels);
    content.replaceChildren(category, ...body.children);
    dialog.setAttribute("aria-labelledby", heading.id);
    currentEntry = entry;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  function syncLocation() {
    const target = document.getElementById(location.hash.slice(1));
    if (target && source.contains(target) && triggers.has(target.id)) {
      openEntry(target);
      return;
    }
    if (dialog.open) {
      dialog.close();
      const trigger = triggers.get(currentEntry.id);
      trigger.focus({ preventScroll: true });
      currentEntry = null;
    }
    // Previously shared year links still lead to the relevant portion of the rail.
    const year = /^#year-(\d{4})$/.exec(location.hash)?.[1];
    if (year) {
      const x = layout.xForYear(year);
      if (x !== null) goToOffset(x - clearLeft);
    }
  }

  function dismiss() {
    if (history.state?.timelineEntry === currentEntry?.id) {
      history.back();
    } else {
      // A visitor may have arrived here directly from a project link on the homepage.
      history.replaceState(history.state, "", location.pathname + location.search);
      syncLocation();
    }
  }

  viewport.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      step(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  window.addEventListener("scroll", renderScroll, { passive: true });
  window.addEventListener("resize", measure);

  dialog.querySelector("[data-close]").addEventListener("click", dismiss);
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    dismiss();
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
  });
  window.addEventListener("hashchange", syncLocation);
  window.addEventListener("popstate", syncLocation);
  source.hidden = true;
  document.body.classList.add("timeline-enhanced");
  measure();
  syncLocation();
})();
