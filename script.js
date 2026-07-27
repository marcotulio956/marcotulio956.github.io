const profile = {
  name: "Marco Tulio",
  tagline: "Engineer, researcher, and builder.",
  about:
    "I build software and explore ideas in technology, systems, and research. This page collects my work, writing, and social links.",
  projects: [
    {
      title: "marcotulio956.github.io",
      description: "Personal landing page and portfolio.",
      url: "https://github.com/marcotulio956/marcotulio956.github.io",
    },
  ],
  papers: [
    {
      title: "Sample Whitepaper",
      description: "A placeholder for upcoming papers and whitepapers.",
      url: "#",
    },
  ],
  posts: [
    {
      title: "Systems Thinking in Practice",
      summary: "How to reason about complexity and trade-offs in software.",
      labels: ["systems", "engineering"],
      url: "#",
    },
    {
      title: "Research Notes: AI and Tooling",
      summary: "Notes on practical AI usage in software workflows.",
      labels: ["ai", "research"],
      url: "#",
    },
    {
      title: "Writing Maintainable Code",
      summary: "Principles to keep software clear, resilient, and scalable.",
      labels: ["engineering", "quality"],
      url: "#",
    },
  ],
  socials: [
    { name: "GitHub", url: "https://github.com/marcotulio956" },
    { name: "LinkedIn", url: "#" },
  ],
};

const state = {
  activeLabel: "all",
};

function el(id) {
  return document.getElementById(id);
}

function card({ title, description, summary, url, labels }) {
  const text = description || summary || "";
  const labelHtml = labels?.length
    ? `<p class="labels">${labels.map((label) => `<span>${label}</span>`).join("")}</p>`
    : "";

  return `
    <article class="card">
      <h3>${title}</h3>
      <p>${text}</p>
      ${labelHtml}
      <a href="${url}" target="_blank" rel="noopener noreferrer">Open</a>
    </article>
  `;
}

function renderProfile() {
  el("name").textContent = profile.name;
  el("tagline").textContent = profile.tagline;
  el("about").textContent = profile.about;

  el("projects").innerHTML = profile.projects.map(card).join("");
  el("papers").innerHTML = profile.papers.map(card).join("");
  renderPosts();
  renderSocials();
}

function renderSocials() {
  el("socials").innerHTML = profile.socials
    .map(
      ({ name, url }) =>
        `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a></li>`
    )
    .join("");
}

function uniqueLabels() {
  return [...new Set(profile.posts.flatMap((post) => post.labels))].sort();
}

function renderFilters() {
  const labels = ["all", ...uniqueLabels()];
  el("post-filters").innerHTML = labels
    .map((label) => {
      const active = state.activeLabel === label;
      return `<button class="filter${active ? " active" : ""}" data-label="${label}">${label}</button>`;
    })
    .join("");
}

function filteredPosts() {
  if (state.activeLabel === "all") {
    return profile.posts;
  }

  return profile.posts.filter((post) => post.labels.includes(state.activeLabel));
}

function renderPosts() {
  renderFilters();
  const posts = filteredPosts();
  el("posts").innerHTML = posts.map(card).join("");
}

function setupFilterEvents() {
  el("post-filters").addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const nextLabel = target.dataset.label;
    if (!nextLabel || nextLabel === state.activeLabel) {
      return;
    }

    state.activeLabel = nextLabel;
    renderPosts();
  });
}

renderProfile();
setupFilterEvents();
