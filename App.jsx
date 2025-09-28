import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [posts, setPosts] = useState(() => {
    try {
      const raw = localStorage.getItem("quill_posts_v1");
      return raw ? JSON.parse(raw) : sampleSeed();
    } catch (e) {
      return sampleSeed();
    }
  });

  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const loadMoreRef = useRef(null);
  const [showFooterLinks, setShowFooterLinks] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    localStorage.setItem("quill_posts_v1", JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          if (ent.isIntersecting) setVisibleCount((v) => Math.min(posts.length, v + 5));
        });
      },
      { rootMargin: "200px" }
    );
    if (loadMoreRef.current) obs.observe(loadMoreRef.current);
    return () => obs.disconnect();
  }, [posts.length]);

  useEffect(() => {
    function onScroll() {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 60;
      setShowFooterLinks(nearBottom);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = posts
    .filter((p) => {
      if (activeTag && !p.tags.includes(activeTag)) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.tags.join(" ").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const visible = filtered.slice(0, visibleCount);

  function persistVote(postId, delta) {
    setPosts((curr) =>
      curr.map((p) => {
        if (p.id !== postId) return p;
        const next = { ...p, votes: (p.votes || 0) + delta };
        return next;
      })
    );
  }

  function handleUpvote(id) {
    const key = `quill_vote_${id}`;
    const prev = Number(localStorage.getItem(key) || 0);
    if (prev === 1) return;
    const delta = prev === -1 ? 2 : 1;
    localStorage.setItem(key, "1");
    persistVote(id, delta);
  }
  function handleDownvote(id) {
    const key = `quill_vote_${id}`;
    const prev = Number(localStorage.getItem(key) || 0);
    if (prev === -1) return;
    const delta = prev === 1 ? -2 : -1;
    localStorage.setItem(key, "-1");
    persistVote(id, delta);
  }

  function handleShare(id) {
    const shareUrl = `${window.location.origin}${window.location.pathname}#post-${id}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => alert("Share link copied to clipboard"))
      .catch(() => prompt("Copy this link:", shareUrl));
  }

  function handleImageUpload(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function submitForm(e) {
    e.preventDefault();
    const image = form.imageFile ? await handleImageUpload(form.imageFile) : form.imageURL || null;
    if (editing && form.id) {
      setPosts((curr) => curr.map((p) => (p.id === form.id ? { ...p, title: form.title, body: form.body, tags: dedupeTags(form.tags), image } : p)));
      setEditing(false);
      setForm(emptyForm());
      return;
    }
    const newPost = {
      id: String(Date.now()) + Math.floor(Math.random() * 9999),
      title: form.title || "Untitled",
      body: form.body || "",
      tags: dedupeTags(form.tags),
      image,
      votes: 0,
      createdAt: Date.now(),
    };
    setPosts((curr) => [newPost, ...curr]);
    setForm(emptyForm());
  }

  function editPost(p) {
    setEditing(true);
    setForm({ id: p.id, title: p.title, body: p.body, tags: p.tags.join(", "), imageURL: p.image, imageFile: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deletePost(id) {
    if (!confirm("Delete post permanently?")) return;
    setPosts((curr) => curr.filter((p) => p.id !== id));
  }

  const tagSet = Array.from(new Set(posts.flatMap((p) => p.tags))).filter(Boolean);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#post-")) {
      const id = hash.replace("#post-", "");
      setTimeout(() => {
        const el = document.getElementById(`post-${id}`);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      <header className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold">Quill — your compact knowledge hub</h1>
        <p className="text-sm opacity-80 mt-1">Write threads, explain ideas, tag them, and let the world (or just you) vote.</p>
      </header>

      <main className="max-w-4xl mx-auto mt-6">
        <section className="bg-white shadow rounded p-4">
          <form onSubmit={submitForm}>
            <div className="flex gap-2">
              <input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Title" className="flex-1 p-2 border rounded" />
              <input value={form.tags} onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))} placeholder="comma-separated tags" className="w-48 p-2 border rounded" />
            </div>
            <textarea value={form.body} onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))} placeholder="Write your explanation..." className="w-full mt-2 p-2 border rounded min-h-[120px]" />
            <div className="flex items-center gap-2 mt-2">
              <input type="url" value={form.imageURL} onChange={(e) => setForm((s) => ({ ...s, imageURL: e.target.value }))} placeholder="Image URL (optional)" className="flex-1 p-2 border rounded" />
              <input type="file" accept="image/*" onChange={(e) => setForm((s) => ({ ...s, imageFile: e.target.files?.[0] ?? null }))} className="p-1" />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">{editing ? "Update" : "Post"}</button>
              {editing && (
                <button type="button" className="px-3 py-2 border rounded" onClick={() => { setEditing(false); setForm(emptyForm()); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input placeholder="Search by title, body or tags" value={query} onChange={(e) => { setQuery(e.target.value); setVisibleCount(10); }} className="flex-1 p-2 border rounded" />
            <div className="flex gap-2">
              <button className={`px-3 py-1 rounded ${!activeTag ? "bg-gray-200" : "border"}`} onClick={() => setActiveTag(null)}>
                All
              </button>
              {tagSet.slice(0, 8).map((t) => (
                <button key={t} onClick={() => { setActiveTag(t); setVisibleCount(10); }} className={`px-3 py-1 rounded ${activeTag === t ? "bg-blue-600 text-white" : "border"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            {visible.length === 0 && <p className="p-4 text-center text-sm opacity-70">No posts match your search.</p>}
            {visible.map((p) => (
              <article id={`post-${p.id}`} key={p.id} className="bg-white p-4 rounded shadow mb-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{p.title}</h2>
                    <div className="text-sm opacity-70">{new Date(p.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center text-sm">
                      <button onClick={() => handleUpvote(p.id)} className="p-1 rounded hover:bg-gray-100">▲</button>
                      <div>{p.votes ?? 0}</div>
                      <button onClick={() => handleDownvote(p.id)} className="p-1 rounded hover:bg-gray-100">▼</button>
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <button onClick={() => handleShare(p.id)} className="px-2 py-1 border rounded">Share</button>
                      <button onClick={() => editPost(p)} className="px-2 py-1 border rounded">Edit</button>
                      <button onClick={() => deletePost(p.id)} className="px-2 py-1 border rounded text-red-600">Delete</button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {p.image && (
                    // eslint-disable-next-line jsx-a11y/img-redundant-alt
                    <img src={p.image} alt={`image for ${p.title}`} className="w-full max-h-72 object-cover rounded" />
                  )}
                  <p style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {p.tags.map((t) => (
                    <button key={t} onClick={() => setActiveTag(t)} className="text-xs px-2 py-1 border rounded">#{t}</button>
                  ))}
                </div>
              </article>
            ))}

            <div ref={loadMoreRef} className="py-6 text-center text-sm opacity-70">
              {visible.length < filtered.length ? "Loading more..." : "End of results"}
            </div>
          </div>
        </section>
      </main>

      <footer className={`fixed bottom-4 right-4 transition-transform ${showFooterLinks ? "translate-y-0" : "translate-y-40"}`}>
        <div className="bg-white shadow rounded p-3 flex flex-col gap-2 w-64">
          <strong>Find me elsewhere</strong>
          <div className="flex flex-col text-sm">
            <a href="https://instagram.com/" target="_blank" rel="noreferrer" className="underline">Instagram</a>
            <a href="https://reddit.com/" target="_blank" rel="noreferrer" className="underline">Reddit</a>
            <a href="https://quora.com/" target="_blank" rel="noreferrer" className="underline">Quora</a>
            <a href="https://github.com/" target="_blank" rel="noreferrer" className="underline">GitHub</a>
          </div>
          <div className="text-xs opacity-60">(Shown when you reach page bottom)</div>
        </div>
      </footer>
    </div>
  );
}

function emptyForm() {
  return { id: null, title: "", body: "", tags: "", imageURL: "", imageFile: null };
}
function dedupeTags(raw) {
  return String(raw || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

function sampleSeed() {
  return [
    {
      id: "seed-1",
      title: "How to think about opportunity cost",
      body:
        "Opportunity cost is the value of the best alternative you give up when making a choice. Frame decisions as trade-offs; the unseen cost often matters more than the visible price.",
      tags: ["economics", "decision-making"],
      image: null,
      votes: 12,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    },
    {
      id: "seed-2",
      title: "Why learn to program as a non-engineer",
      body:
        "Programming teaches you to formalize problems, test hypotheses, and automate repetitive work. You don't need to ship products — the mindset is the value.",
      tags: ["productivity", "programming"],
      image: null,
      votes: 8,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    },
  ];
}
