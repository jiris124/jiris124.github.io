# Personal website

Jiří Svoboda’s personal site uses plain HTML, CSS, and JavaScript. The homepage
(`index.html`) includes the introduction and short CV. The full timeline lives
in `timeline.html`. Both pages share `style.css` and the light/dark switch in
`theme.js`.

## Run locally

Start the local server from the project directory.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the homepage](http://127.0.0.1:8000/) or
[the timeline](http://127.0.0.1:8000/timeline.html).

## Timeline

The full-width timeline opens at the newest dates on the right. Scroll down
to move into the past. When the timeline has keyboard focus, the left and
right arrow keys move through time. Each category has a fixed label on the
left. Dates and vertical guides give every row the same time scale.

Each bar spans its entry’s duration. Short events have a minimum width so
their titles stay readable. Events that overlap stack within their category.
All lanes match the height of the tallest stack. Ongoing bars fade at the present date.
On long bars, the title follows the center of the visible portion. Each bar’s
border blends its topic colors, with matching dots stacked beside the title.
Select a bar to open its details. A direct link such as
`timeline.html#prediction-markets-framework` opens that entry’s dialog.
Undated entries appear below the timeline.

## Add an entry

Add an `article.entry-detail` inside `#timeline-source` in `timeline.html`.
Give it a unique, stable `id`. The `h2` supplies the clickable title. Use
`data-short-title` when a long title needs a shorter version on the timeline.

```html
<article
  class="entry-detail"
  id="prediction-markets-framework"
  data-category="projects"
  data-topics="ai-ml finance"
  data-start="2026-07"
  data-end="present"
>
  <h2>Prediction Markets Framework</h2>
  <p class="entry-date"><time datetime="2026-07">Jul 2026</time> — Present</p>
  <p class="entry-description">TODO</p>
</article>
```

- Pick one `data-category` value from `experience`, `education`, `training`,
  `projects`, or `hackathons`. Use `training` for certifications,
  `projects` for research, and `hackathons` for competitions. Uncomment the
  Experience lane in `timeline.html` when adding the first experience entry.
- Set `data-topics` to any space-separated combination of `ai-ml`, `quantum`,
  `finance`, and `medicine`. An entry can also have no topics.
- Use `YYYY-MM` for the start and end months, or `present` for an ongoing
  entry’s end. Keep the reader-facing `.entry-date` text in sync. For a
  single-day event, the visible date can include the exact day.
- Omit unknown dates. Entries without a valid start month appear under
  **Undated**.

`timeline-layout.js` positions the entries and date guides. `timeline.js`
connects the timeline to page scrolling and opens the detail dialogs.
With JavaScript disabled or no browser support for modal dialogs, visitors can
read the articles directly. Keep the HTML in newest-first order for this view.
