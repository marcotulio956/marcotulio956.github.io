const { useEffect, useMemo, useState } = React;

const profileData = {
  tagline: "Engineer, researcher, and builder.",
  about:
    "I build software and explore ideas in technology, systems, and research. This page collects my work, writing, and social links.",
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

function Section({ title, children }) {
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Card({ title, description, summary, url, labels }) {
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
      <a href={url} target="_blank" rel="noopener noreferrer">
        Open
      </a>
    </article>
  );
}

function App() {
  const [activeLabel, setActiveLabel] = useState("all");
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);

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

  const labels = useMemo(() => {
    return [
      "all",
      ...new Set(profileData.posts.flatMap((post) => post.labels || [])),
    ];
  }, []);

  const filteredPosts = useMemo(() => {
    if (activeLabel === "all") {
      return profileData.posts;
    }

    return profileData.posts.filter((post) => post.labels.includes(activeLabel));
  }, [activeLabel]);

  return (
    <>
      <header className="hero">
        <div className="container">
          <img
            className="hero-banner"
            src={user?.avatar_url || "https://avatars.githubusercontent.com/u/1314065622?v=4"}
            alt="Profile banner"
          />
          <p className="tagline">{profileData.tagline}</p>
        </div>
      </header>

      <main className="container">
        <Section title="About Me">
          <p>
            {user?.name || "Marco Tulio"} — {user?.bio || profileData.about}
          </p>
        </Section>

        <Section title="Projects">
          <div className="grid">
            {projects.map((project) => (
              <Card key={project.url} {...project} />
            ))}
          </div>
        </Section>

        <Section title="Papers & Whitepapers">
          <div className="grid">
            {profileData.papers.map((paper) => (
              <Card key={paper.title} {...paper} />
            ))}
          </div>
        </Section>

        <Section title="Posts">
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
            {filteredPosts.map((post) => (
              <Card key={post.title} {...post} />
            ))}
          </div>
        </Section>

        <Section title="Socials">
          <ul className="socials">
            {profileData.socials.map((social) => (
              <li key={social.name}>
                <a href={social.url} target="_blank" rel="noopener noreferrer">
                  [+] {social.name}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
