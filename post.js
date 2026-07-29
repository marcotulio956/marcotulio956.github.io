const { useEffect, useState } = React;

function App() {
  const [post, setPost] = useState(null);
  const [error, setError] = useState(false);
  const slug = new URLSearchParams(window.location.search).get("slug");

  useEffect(() => {
    if (!slug) return setError(true);
    window.postLibrary.loadPost(slug).then((loadedPost) => {
      document.title = `${loadedPost.title} | Marco Túlio`;
      setPost(loadedPost);
    }).catch(() => setError(true));
  }, [slug]);

  if (error) return <main className="container post-page"><h1>Post not found</h1><p className="show-all-wrap"><a className="show-all" href="posts.html">Back to posts</a></p></main>;
  if (!post) return <main className="container post-page"><p>Loading post…</p></main>;

  const html = DOMPurify.sanitize(marked.parse(post.body));
  return (
    <main className="container post-page">
      <p className="show-all-wrap"><a className="show-all" href="posts.html">← All posts</a></p>
      <article>
        <h1>{post.title}</h1>
        <p className="post-date">{post.date}</p>
        <p className="labels">{post.labels.map((label) => <span key={label}>[+] {label}</span>)}</p>
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
