# marcotulio956.github.io

created with [Axios](https://github.com/axios/axios)

credit to [awesome-designs](https://github.com/VoltAgent/awesome-design-md) for the [opencode.ai design.md](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/opencode.ai)

## Publishing posts

Posts are Markdown files in `posts/`. Add an entry for each new file to `posts-data.js` using its filename and a unique slug. Each post needs this front matter:

```md
---
title: Post title
summary: A short card summary.
date: 2026-07-28
labels: engineering, research
---
```

## Choosing projects

Edit the `projects` list in `profile-data.js` to choose the project cards and their display order. Each `repository` value must match a repository name on your GitHub profile. An optional `title` or `description` overrides the values fetched from GitHub.

```js
projects: [
  { repository: "my-project", description: "What it does." },
  { repository: "another-project", title: "A clearer display title" },
],
```

_fell free to use these repos_
