# Quill — Personal Knowledge Hub

A compact Vite + React + Tailwind starter repo that implements:
- Post creation (title, body, tags, optional image upload)
- Search and tag filtering
- Newest → oldest post ordering
- Upvote / downvote stored in localStorage per user
- Share link (URL fragment)
- Infinite-style loading and footer social links

## Quick start

1. Install dependencies:
```
npm install
```

2. Start dev server:
```
npm run dev
```

3. Build:
```
npm run build
```

Notes:
- This is a client-side demo. For multi-user persistence and secure voting, connect a backend (Firestore / Supabase / custom API).
- Tailwind is included in devDependencies; run `npx tailwindcss init` if you change config.

