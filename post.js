const { useEffect, useState } = React;

function notebookViewerUrl(notebookUrl) {
  if (!notebookUrl) return null;

  try {
    const url = new URL(notebookUrl);
    if (url.protocol !== "https:") return null;
    if (url.hostname === "github.com") {
      return `https://nbviewer.org/github${url.pathname}`;
    }
    return url.href;
  } catch (_error) {
    return null;
  }
}

function App() {
  const [post, setPost] = useState(null);
  const [error, setError] = useState(false);
  const markdownRef = React.useRef(null);
  const slug = new URLSearchParams(window.location.search).get("slug");

  useEffect(() => {
    if (!slug) return setError(true);
    window.postLibrary.loadPost(slug).then((loadedPost) => {
      document.title = `${loadedPost.title} | Marco Túlio`;
      setPost(loadedPost);
    }).catch(() => setError(true));
  }, [slug]);

  const html = post ? DOMPurify.sanitize(marked.parse(post.body)) : "";
  useEffect(() => {
    if (!markdownRef.current) return;
    renderMathInElement(markdownRef.current, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
    });
  }, [html]);

  useEffect(() => {
    if (!markdownRef.current) return;

    const renderDiagrams = () => {
      const diagrams = [...markdownRef.current.querySelectorAll("pre > code.language-mermaid")].map((code) => {
        const diagram = document.createElement("div");
        diagram.className = "mermaid";
        diagram.textContent = code.textContent;
        code.parentElement.replaceWith(diagram);
        return diagram;
      });

      if (!diagrams.length || !window.mermaid) return;
      window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "base" });
      window.mermaid.run({ nodes: diagrams });
    };

    if (window.mermaid) {
      renderDiagrams();
      return undefined;
    }

    window.addEventListener("mermaid-ready", renderDiagrams, { once: true });
    return () => window.removeEventListener("mermaid-ready", renderDiagrams);
  }, [html]);

  if (error) return <main className="container post-page"><h1>Post not found</h1><p className="show-all-wrap"><a className="show-all" href="posts.html">Back to posts</a></p></main>;
  if (!post) return <main className="container post-page"><p>Loading post…</p></main>;

  const notebookUrl = notebookViewerUrl(post.notebook);
  return (
    <main className="container post-page">
      <p className="show-all-wrap"><a className="show-all" href="posts.html">← All posts</a></p>
      <article>
        <h1>{post.title}</h1>
        <p className="post-date">{post.date}</p>
        <p className="labels">{post.labels.map((label) => <span key={label}>[+] {label}</span>)}</p>
        <div ref={markdownRef} className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
        {notebookUrl ? (
          <section className="notebook-embed" aria-label="Embedded Jupyter notebook">
            <h2>Notebook</h2>
            <iframe title={`Notebook: ${post.title}`} src={notebookUrl} loading="lazy" />
            <p>
              <a href={post.notebook} target="_blank" rel="noopener noreferrer">
                Open the notebook on GitHub
              </a>
            </p>
          </section>
        ) : null}
      </article>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
