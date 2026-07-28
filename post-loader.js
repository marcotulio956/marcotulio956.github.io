(function () {
  function parseFrontMatter(markdown) {
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return { metadata: {}, body: markdown };
    const metadata = match[1].split(/\r?\n/).reduce((result, line) => {
      const separator = line.indexOf(":");
      if (separator === -1) return result;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      result[key] = key === "labels" ? value.split(",").map((label) => label.trim()).filter(Boolean) : value;
      return result;
    }, {});
    return { metadata, body: match[2] };
  }

  async function loadPost(slug) {
    const entry = window.postManifest.find((post) => post.slug === slug);
    if (!entry) throw new Error("Post not found");
    const response = await fetch(entry.source);
    if (!response.ok) throw new Error("Unable to load post");
    const parsed = parseFrontMatter(await response.text());
    return { ...entry, ...parsed.metadata, body: parsed.body, url: `post.html?slug=${encodeURIComponent(entry.slug)}` };
  }

  window.postLibrary = {
    loadPost,
    loadPosts: () =>
      Promise.all(window.postManifest.map((post) => loadPost(post.slug))).then((posts) =>
        posts.sort((first, second) => (second.date || "").localeCompare(first.date || ""))
      ),
  };
})();
