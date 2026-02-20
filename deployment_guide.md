# 🚀 Deployment Guide: Render Blueprint

I have configured your project with a `render.yaml` file. This tells Render exactly how to set up both your **Backend** (Node.js API) and **Frontend** (React Static Site) automatically.

Follow these steps to deploy:

### Step 1: Push latest changes
Ensure the files I just created/modified are on GitHub (I have already pushed them from here):
```bash
git add .
git commit -m "Final deployment configuration"
git push origin main
```

### Step 2: Create Blueprint on Render
1.  Go to your [Render Dashboard](https://dashboard.render.com/).
2.  Click the **New +** button in the top right.
3.  Select **Blueprint** from the menu.
4.  Connect your GitHub repository: `OsasDev/QIRLLO-ORIGINAL`.

### Step 3: Configure Environment Variables
Render will detect the `render.yaml` file and show you a list of required variables. You need to fill these in:

#### **For `qirllo-backend`:**
- **`MONGO_URL`**: Your MongoDB Atlas connection string.
- **`JWT_SECRET`**: A random long string for security (e.g., `qirllo-secret-key-2026`).
- **`FRONTEND_URL`**: Set this to your frontend's Render URL (it will look like `https://qirllo-frontend.onrender.com`).

#### **For `qirllo-frontend`:**
- **`REACT_APP_BACKEND_URL`**: Set this to your backend's Render URL (it will look like `https://qirllo-backend.onrender.com`).

### Step 4: Deploy 🚀
1.  Click **Approve** or **Apply**.
2.  Render will start building both services.
3.  **Backend** will run `npm install` -> `npm run build` -> `npm start`.
4.  **Frontend** will run `npm install` -> `npm run build` and serve the `build` folder.

---

### 🔍 Troubleshooting
- **Build Fails?** Check the "Events" or "Logs" tab. The `postinstall` script I added to `package.json` ensures it builds even if Render missed the command.
- **CORS Issues?** Ensure the `FRONTEND_URL` in backend settings matches your actual frontend URL exactly.
- **MongoDB Error?** Make sure you have whitelisted "0.0.0.0/0" (all IPs) in your MongoDB Atlas Network Access settings, as Render IPs change.
