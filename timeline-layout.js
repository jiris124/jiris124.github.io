(() => {
  "use strict";

  const monthFormat = new Intl.DateTimeFormat("en", {
    month: "short", year: "numeric", timeZone: "UTC",
  });
  const barGap = 6;
  // Allow for the button's borders, inner spacing, and fractional font metrics.
  const captionPadding = 13;

  // Whole numbers are month boundaries. A day occupies its share of that
  // particular month, so every date and duration uses the same ruler.
  function monthNumber(value) {
    if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value || "")) return NaN;
    const [year, month] = value.split("-").map(Number);
    return year * 12 + month - 1;
  }

  function dayPosition(month, day, inclusiveEnd) {
    const days = new Date(Date.UTC(Math.floor(month / 12), month % 12 + 1, 0)).getUTCDate();
    if (day < 1 || day > days) return NaN;
    return month + (day - 1 + Number(inclusiveEnd)) / days;
  }

  function readRange(entry, today) {
    const startMonth = monthNumber(entry.dataset.start);
    if (!Number.isFinite(startMonth)) return null;
    const endMonth = monthNumber(entry.dataset.end || entry.dataset.start);
    const times = entry.querySelectorAll(".entry-date time");
    function exactEndpoint(month, time, end) {
      const date = time?.dateTime || "";
      if (/^\d{4}-\d\d-\d\d$/.test(date) && monthNumber(date.slice(0, 7)) === month) {
        const exact = dayPosition(month, Number(date.slice(8)), end);
        if (Number.isFinite(exact)) return exact;
      }
      return null;
    }
    const first = times[0];
    const last = times[times.length - 1];
    const start = exactEndpoint(startMonth, first, false) ?? startMonth;
    const end = entry.dataset.end === "present"
      ? dayPosition(today.getFullYear() * 12 + today.getMonth(), today.getDate(), true)
      : (exactEndpoint(endMonth, last, true) ?? endMonth + 1);
    return end > start ? { start, end } : null;
  }

  window.createTimelineLayout = function ({ viewport, axis, grid, lanes, entries, triggers }) {
    const records = new Map();
    const byLane = new Map(lanes.map(lane => [lane.dataset.category, {
      bars: lane.querySelector(".lane-bars"), records: [],
    }]));
    const today = new Date();
    for (const entry of entries) {
      const range = readRange(entry, today);
      const group = byLane.get(entry.dataset.category);
      if (!range || !group) continue;
      const button = triggers.get(entry.id);
      if (entry.dataset.end === "present") {
        button.classList.add("entry-ongoing");
        button.setAttribute("aria-description", "Ongoing");
      }
      const record = { ...range, button, caption: button.querySelector(".entry-caption") };
      group.bars.append(button);
      group.records.push(record);
      records.set(entry.id, record);
    }

    const all = [...records.values()];
    const firstMonth = all.length ? Math.floor(Math.min(...all.map(record => record.start))) : 0;
    const lastMonth = all.length ? Math.ceil(Math.max(...all.map(record => record.end))) - 1 : -1;
    let origin = 0;
    let monthWidth = 0;

    function buildRuler() {
      const ticks = document.createDocumentFragment();
      const guides = document.createDocumentFragment();
      for (let month = firstMonth; month <= lastMonth; month += 1) {
        const date = new Date(Date.UTC(Math.floor(month / 12), month % 12, 1));
        const x = origin + (month - firstMonth) * monthWidth;
        const label = document.createElement("time");
        label.className = "date-tick";
        label.dateTime = date.toISOString().slice(0, 7);
        label.textContent = monthFormat.format(date);
        label.style.left = x + "px";
        ticks.append(label);
        const line = document.createElement("span");
        line.className = "gridline";
        line.style.left = x + "px";
        guides.append(line);
      }
      axis.replaceChildren(ticks);
      grid.replaceChildren(guides);
    }

    function measure() {
      const viewWidth = viewport.clientWidth;
      const clearLeft = lanes[0]?.querySelector(".lane-label").offsetWidth || 0;
      const captionLimit = Math.max(64, Math.min(224, viewWidth - clearLeft - 32));
      viewport.style.setProperty("--caption-limit", captionLimit + "px");
      monthWidth = 1.5 * Math.max(80, Math.min(112, Math.round(viewWidth / 10)));

      // Measure all captions together before assigning their actual bar widths.
      for (const { button, caption } of all) {
        caption.style.removeProperty("max-width");
        button.style.width = captionLimit + 2 * captionPadding + "px";
      }
      let earliest = 0;
      let latest = (lastMonth - firstMonth) * monthWidth + 36;
      for (const record of all) {
        record.captionWidth = Math.ceil(record.caption.getBoundingClientRect().width);
        const duration = (record.end - record.start) * monthWidth;
        const width = Math.max(record.captionWidth + 2 * captionPadding, duration - barGap);
        const center = (record.start - firstMonth) * monthWidth + duration / 2;
        record.left = center - width / 2;
        record.right = center + width / 2;
        earliest = Math.min(earliest, record.left);
        latest = Math.max(latest, record.right);
      }

      // Leave room for the frozen category heading at the oldest end. Short
      // recent events can extend beyond their true dates to fit their titles.
      origin = Math.max(clearLeft + 14 - earliest, viewWidth - 16 - latest);
      let tallestLane = 1;
      for (const group of byLane.values()) {
        const members = group.records;
        const rowEnds = [];
        // Pack by *drawn* width, including short labels widened for readability.
        members.sort((a, b) => a.left - b.left || b.right - a.right);
        for (const record of members) {
          record.left += origin;
          record.right += origin;
          let row = rowEnds.findIndex(right => right + barGap <= record.left + 0.01);
          if (row === -1) row = rowEnds.length;
          rowEnds[row] = record.right;
          record.row = row;
          record.button.style.left = record.left + "px";
          record.button.style.width = (record.right - record.left) + "px";
        }
        group.rowCount = rowEnds.length;
        tallestLane = Math.max(tallestLane, group.rowCount);
      }
      viewport.style.setProperty("--row-count", tallestLane);
      for (const group of byLane.values()) {
        const firstRow = (tallestLane - group.rowCount) / 2;
        for (const record of group.records) {
          record.button.style.setProperty("--row", firstRow + record.row);
        }
      }
      buildRuler();
      return Math.max(viewWidth, Math.ceil(origin + latest + 16));
    }

    function render(offset, clearLeft, rightEdge) {
      for (const record of all) {
        const left = Math.max(record.left, offset + clearLeft);
        const right = Math.min(record.right, offset + rightEdge);
        if (right <= left) continue;
        // A partly visible long bar can still show its entire label on two
        // lines. Stop shrinking before it would fracture into tiny pieces.
        const readableWidth = Math.min(record.captionWidth, Math.max(140, record.captionWidth * 0.65));
        const captionWidth = Math.min(record.captionWidth,
          Math.max(readableWidth, Math.floor(right - left - 2 * captionPadding)));
        record.caption.style.maxWidth = captionWidth + "px";
        const halfCaption = captionWidth / 2 + captionPadding;
        const center = Math.max(record.left + halfCaption,
          Math.min(record.right - halfCaption, (left + right) / 2));
        record.caption.style.left = (center - record.left) + "px";
      }
    }

    return {
      measure,
      render,
      boundsFor(id) {
        const record = records.get(id);
        return record ? { left: record.left, right: record.right } : null;
      },
      xForYear(year) {
        return all.length ? origin + (Number(year) * 12 - firstMonth) * monthWidth : null;
      },
    };
  };
})();
