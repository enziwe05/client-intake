# Client Intake Chatbot — Netlify Version

AI-powered intake chatbot for freelance web developers. Clients chat, answer questions, get a brief generated — you receive it and start building.

## File structure
```
intake-chatbot/
├── index.html                  ← the chatbot page
├── netlify.toml                ← routes /api/chat to the function
├── netlify/
│   └── functions/
│       └── chat.js             ← serverless function (keeps API key secret)
└── README.md
```

## Deploy in 4 steps

### 1. Get your Anthropic API key
- Go to console.anthropic.com
- Sign in → API Keys → Create Key
- Copy it (starts with `sk-ant-...`)

### 2. Push to GitHub
Open Command Prompt in the project folder and run:
```
git init
git add .
git commit -m "Client intake chatbot"
git remote add origin https://github.com/YOUR_USERNAME/client-intake.git
git push -u origin main
```

### 3. Deploy on Netlify
- Go to app.netlify.com → Add new site → Import from Git
- Connect GitHub and select your repo
- Build settings: leave blank (no build command needed)
- Click **Deploy site**
- Go to Site settings → Environment variables → Add:
  - Key: `ANTHROPIC_API_KEY`
  - Value: your key from step 1
- Trigger a redeploy (Deploys tab → Trigger deploy)

### 4. Share the link
Your live URL will be something like `https://sparkly-llama-abc123.netlify.app`

Rename it under Site settings → Domain management → Options → Edit site name

Then send this on LinkedIn:
> "Here's a quick link to tell me about your project — takes 3–5 mins: [your-link]"

## Customise
- Change budget ranges: search `R5k` in index.html
- Change your name in the header: edit the `<h1>` tag
- Change the welcome tone: edit the SYSTEM prompt in index.html
