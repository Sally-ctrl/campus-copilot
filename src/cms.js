// Runs INSIDE the CMS tab (injected with chrome.scripting.executeScript).
// Must be self-contained: no imports, no outside variables.
// Reads the course page structure directly, no AI needed.
export function readCmsPage() {
  const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();

  const courseName = clean(
    document.querySelector("[id$='_LabelCourseName']")?.innerText ?? document.title
  );
  const code = courseName.match(/\(\|\s*([A-Z]{2,5}\s?\d{3})\s*\|\)/)?.[1]?.replace(/\s/g, "") ?? null;

  // Course-level announcements (e.g. "Quiz 2 Distribution").
  const announcements = [];
  const desc = document.querySelector("[id$='_ContentPlaceHoldercontent_desc']");
  if (desc && clean(desc.innerText)) announcements.push(desc.innerText.trim());

  // Weeks and their materials.
  const materials = [];
  for (const week of document.querySelectorAll(".weeksdata")) {
    // CMS writes dates unpadded ("2026-11-7"), so pad them to "2026-11-07".
    const dm = week.querySelector("h2")?.innerText.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    const weekDate = dm ? `${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}` : null;

    // Week-level announcement, if any.
    for (const box of week.querySelectorAll(".p-3 > div")) {
      const label = clean(box.querySelector("strong")?.innerText);
      const text = clean(box.querySelector("p")?.innerText);
      if (label === "Announcement" && text) announcements.push(`[Week of ${weekDate}] ${text}`);
    }

    for (const item of week.querySelectorAll("div[id^='content']")) {
      const id = item.id.replace("content", "");
      if (!/^\d+$/.test(id)) continue;
      const raw = clean(item.innerText); // "2 - Practice Assignment 1 (Assignment )"
      const type = clean(raw.match(/\(([^)]*)\)\s*$/)?.[1]);
      const title = clean(
        (item.querySelector("strong")?.innerText ?? raw).replace(/^\d+\s*-\s*/, "")
      );
      const btn = item.closest(".card-body")?.querySelector("a.contentbtn, [data-url]");
      const href = btn?.getAttribute("href") ?? btn?.getAttribute("data-url") ?? null;
      materials.push({
        cmsId: id,
        title,
        type: type || "material",
        date: weekDate,
        link: href ? new URL(href, location.href).href : null,
        opened: btn?.dataset.seen === "yes",
      });
    }
  }

  return { code, courseName, announcements, materials, url: location.href };
}
