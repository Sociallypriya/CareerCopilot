# CareerCopilot frontend

React UI built with Vite. The landing, login, and signup screens use the backend auth routes; the tracker and workspace settings are private to the signed-in account.

```sh
npm install
npm run dev
```

The dev server proxies `/api` to `http://localhost:5000` by default. Set `API_PROXY_TARGET` to use another backend URL. For a separately hosted production frontend, set `VITE_API_BASE_URL` to the backend origin at build time.

Start the backend first. Configure `MONGO_URI`, `GEMINI_API_KEY`, and a `JWT_SECRET` of at least 32 characters in `backend/.env`. A random local `JWT_SECRET` is generated when the project environment file is available. The first account created adopts any existing unowned applications and workspace settings.

```sh
npm run build
```
