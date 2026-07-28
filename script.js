const { useEffect, useMemo, useState } = React;

const profileData = window.profileData || {};
const MAX_HOME_POSTS = 6;

function Section({ id, title, children }) {
  return (
    <section id={id} aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Card({ title, description, summary, url, labels, external = true }) {
  const text = description || summary;

  return (
    <article className="card">
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {labels?.length ? (
        <p className="labels">
          {labels.map((label) => (
            <span key={label}>[+] {label}</span>
          ))}
        </p>
      ) : null}
      <a href={url} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {external ? "Open" : "Read post"}
      </a>
    </article>
  );
}

function App() {
  const [activeLabel, setActiveLabel] = useState("all");
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postsError, setPostsError] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, reposRes] = await Promise.all([
          axios.get("https://api.github.com/users/marcotulio956"),
          axios.get(
            "https://api.github.com/users/marcotulio956/repos?sort=updated&per_page=6"
          ),
        ]);

        setUser(userRes.data);
        setProjects(
          reposRes.data.map((repo) => ({
            title: repo.name,
            description: repo.description || "Repository project",
            url: repo.html_url,
          }))
        );
      } catch (_error) {
        setUser({
          name: "Marco Tulio",
          avatar_url:
            "https://avatars.githubusercontent.com/u/1314065622?v=4",
          bio: profileData.about,
        });
        setProjects([
          {
            title: "marcotulio956.github.io",
            description: "Personal landing page and portfolio.",
            url: "https://github.com/marcotulio956/marcotulio956.github.io",
          },
        ]);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    window.postLibrary.loadPosts().then(setPosts).catch(() => setPostsError(true));
  }, []);

  const labels = useMemo(() => {
    return [
      "all",
      ...new Set(posts.flatMap((post) => post.labels || [])),
    ];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (activeLabel === "all") {
      return posts;
    }

    return posts.filter((post) =>
      (post.labels || []).includes(activeLabel)
    );
  }, [activeLabel, posts]);
  const visiblePosts = useMemo(
    () => filteredPosts.slice(0, MAX_HOME_POSTS),
    [filteredPosts]
  );
  const allPostsLink =
    activeLabel === "all"
      ? "posts.html"
      : `posts.html?label=${encodeURIComponent(activeLabel)}`;

  return (
    <>
      <header className="hero">
        <div className="banner-shell">
          <img className="hero-banner" src="imgs/banner.png" alt="Site banner" />
        </div>
        <div className="container hero-profile">
          <div className="profile-image-wrap">
            <img
              className="profile-image"
              src={user?.avatar_url || "https://avatars.githubusercontent.com/u/1314065622?v=4"}
              alt="Profile picture"
            />
          </div>
          <div>
            <p className="tagline">{profileData.tagline}</p>
          </div>
        </div>
        <div className="container">
          <nav className="section-nav" aria-label="Primary">
            <a href="#projects">Projects</a>
            <a href="#papers">Papers / Whitepapers</a>
            <a href="#posts">Posts</a>
            <a href="#about">About Me</a>
          </nav>
          <p className="posts-cta-wrap">
            <a className="posts-cta" href="posts.html">Browse all posts →</a>
          </p>
        </div>
      </header>

      <main className="container">
        <Section id="projects" title="Projects">
          <div className="grid">
            {projects.map((project) => (
              <Card key={project.url} {...project} />
            ))}
          </div>
        </Section>

        <Section id="papers" title="Papers & Whitepapers">
          <div className="grid">
            {profileData.papers.map((paper) => (
              <Card key={paper.title} {...paper} />
            ))}
          </div>
        </Section>

        <Section id="posts" title="Posts">
          <div className="filters">
            {labels.map((label) => (
              <button
                key={label}
                className={`filter${activeLabel === label ? " active" : ""}`}
                onClick={() => setActiveLabel(label)}
                type="button"
              >
                [{activeLabel === label ? "x" : " "}] {label}
              </button>
            ))}
          </div>
          <div className="grid">
            {visiblePosts.map((post) => (
              <Card key={post.slug} {...post} external={false} />
            ))}
          </div>
          {postsError ? <p>Posts are temporarily unavailable.</p> : null}
          <p className="show-all-wrap">
            <a className="show-all" href={allPostsLink}>
              Show all
            </a>
          </p>
        </Section>

        <Section id="about" title="About Me">
          <div className="about-layout">
            <p>
              {user?.name || "Marco Tulio"} — {user?.bio || profileData.about}
            </p>
            <ul className="socials">
              {profileData.socials.map((social) => (
                <li key={social.name}>
                  <a href={social.url} target="_blank" rel="noopener noreferrer">
                    [+] {social.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
