const { useMemo, useState } = React;

const POSTS_PER_PAGE = 12;

function Card({ title, summary, url, labels }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      {summary ? <p>{summary}</p> : null}
      {labels?.length ? (
        <p className="labels">
          {labels.map((label) => (
            <span key={label}>[+] {label}</span>
          ))}
        </p>
      ) : null}
      <a href={url}>Read post</a>
    </article>
  );
}

function App() {
  const initialLabel = new URLSearchParams(window.location.search).get("label");
  const [activeLabel, setActiveLabel] = useState(
    initialLabel && initialLabel !== "" ? initialLabel : "all"
  );
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    window.postLibrary.loadPosts().then(setPosts).catch(() => setError(true));
  }, []);

  const labels = useMemo(() => {
    return [
      "all",
      ...new Set(posts.flatMap((post) => post.labels || [])),
    ];
  }, [posts]);

  const safeActiveLabel = labels.includes(activeLabel) ? activeLabel : "all";

  const filteredPosts = useMemo(() => {
    if (safeActiveLabel === "all") {
      return posts;
    }

    return posts.filter((post) =>
      (post.labels || []).includes(safeActiveLabel)
    );
  }, [safeActiveLabel, posts]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * POSTS_PER_PAGE;
  const pagePosts = filteredPosts.slice(pageStart, pageStart + POSTS_PER_PAGE);

  function handleLabelChange(label) {
    setActiveLabel(label);
    setPage(1);
  }

  return (
    <>
      <header className="hero compact">
        <div className="container">
          <h1>All Posts</h1>
          <p className="show-all-wrap">
            <a className="show-all" href="index.html#posts">
              Back to home
            </a>
          </p>
        </div>
      </header>

      <main className="container">
        <section aria-label="Posts">
          <h2>Posts</h2>
          <div className="filters">
            {labels.map((label) => (
              <button
                key={label}
                className={`filter${safeActiveLabel === label ? " active" : ""}`}
                onClick={() => handleLabelChange(label)}
                type="button"
              >
                [{safeActiveLabel === label ? "x" : " "}] {label}
              </button>
            ))}
          </div>

          <div className="grid">
            {pagePosts.map((post) => (
              <Card key={post.title} {...post} />
            ))}
          </div>
          {error ? <p>Posts are temporarily unavailable.</p> : null}

          <div className="pagination" role="navigation" aria-label="Post pages">
            <button
              className="filter"
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>
            <p>
              Page {safePage} of {totalPages}
            </p>
            <button
              className="filter"
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
