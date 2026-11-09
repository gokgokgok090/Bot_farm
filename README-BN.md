# SHAKIB_00 — Minecraft Java Sugar Cane Bot

এই প্রজেক্টটি Mineflayer API ব্যবহার করে Minecraft Java সার্ভারে একটি player bot চালায়। Bot owner-only chat command গ্রহণ করে এবং নির্ধারিত farm এলাকার mature sugar cane সংগ্রহ করে।

## গুরুত্বপূর্ণ compatibility নোট

- Minecraft Java `26.2`-এর protocol support-এর জন্য `@wp2508/mineflayer` fork-কে `mineflayer` নামে alias করা হয়েছে (`4.42.7`)। প্রকাশিত npm তথ্য অনুযায়ী এই fork 26.2 সমর্থন করে।
- `mineflayer-pathfinder` `2.4.5` ব্যবহার করা হয়েছে।
- 26.2 compatibility forkটি upstream PrismarineJS-এর অফিসিয়াল release নয়। Production server-এ ব্যবহারের আগে নিজের test server-এ যাচাই করুন।
- এই ZIP তৈরি করার সময় আপনার server-এ live login, farm harvest, chest deposit বা Railway deployment চালিয়ে পরীক্ষা করা হয়নি। তাই এটিকে বাস্তবে Tested বলা হচ্ছে না।
- সার্ভারটি bot/automation অনুমোদন করে কি না আগে নিশ্চিত করুন। সার্ভারের নিয়ম ভাঙতে পারে এমন automation চালাবেন না।

## ফাইলসমূহ

- `bot2.js` — bot, login, commands, farming, pickup, chest deposit, reconnect
- `package.json` — Node.js dependencies ও scripts
- `package-lock.json` — npm lockfile seed; প্রথম `npm install`-এ npm dependency tree পূর্ণ/সংশোধন করতে পারে
- `.npmrc` — npm settings
- `.gitignore` — secret ও generated file Git থেকে বাদ
- `.env.example` — environment variable template
- `start.sh` — Termux start helper

## Configuration

`.env.example` কপি করে `.env` বানান। `BOT_PASSWORD`-এ আপনার নিজের server login password বসান। `.env` কখনো GitHub-এ upload করবেন না।

```env
MC_HOST=secretsmp118.mcsh.io
MC_PORT=25565
MC_USERNAME=SHAKIB_00
OWNER_NAME=RIFAT_MOJO00
BOT_PASSWORD=YOUR_SERVER_LOGIN_PASSWORD
MC_VERSION=26.2
FARM_RADIUS=12
FARM_Y_RADIUS=6
RECONNECT_MS=10000
```

Bot spawn হওয়ার ৩ সেকেন্ড পরে প্রতি connection-এ একবার `/login` পাঠায়। Password log-এ print করে না। `auth: offline` শুধু offline-mode / server-side `/login` authentication-এর জন্য; Microsoft online-mode account authentication নয়।

## Chat commands

শুধু `OWNER_NAME`-এর username নিচের command চালাতে পারবে:

| Command | কাজ |
|---|---|
| `!setfarm` | Bot-এর বর্তমান অবস্থান farm-এর কেন্দ্র হিসেবে save করে |
| `!farm` | Farming loop চালু করে |
| `!stopfarm` | Farming বন্ধ করে |
| `!status` | Bot/farm status দেখায় |

`!setfarm` দেওয়ার সময় bot-কে farm-এর মাঝামাঝি জায়গায় দাঁড় করান। Farm area হলো কেন্দ্র থেকে X/Z-এ `FARM_RADIUS` এবং Y-তে `FARM_Y_RADIUS` ব্লক পর্যন্ত।

## Sugar cane behavior

- কেবল `sugar_cane` block scan করে।
- Cane column-এর নিচের base block চিহ্নিত করে।
- Column ৩ বা তার বেশি ব্লক উঁচু হলেই কাটে।
- উপর থেকে সর্বোচ্চ দুইটি cane block কাটে; base block কখনো কাটে না।
- কাছাকাছি item entity-র দিকে গিয়ে pickup করার চেষ্টা করে।
- Inventory-তে sugar cane থাকলে ২৪ ব্লকের মধ্যে chest/trapped chest খুঁজে deposit করার চেষ্টা করে।
- কাজ শেষে farm scan আবার শুরু করে।

**Farm layout:** bot-কে cane-গুলোর কাছে চলাচলের জায়গা দিন। Chest bot-এর farm area-র কাছাকাছি এবং accessible রাখুন। Bot-এর inventory-তে tool দরকার হলে server-এর block-breaking rules অনুযায়ী উপযুক্ত tool দিন। Hopper/chest protection/plugin restriction থাকলে deposit ব্যর্থ হতে পারে।

## GitHub-এ upload

1. GitHub-এ নতুন repository তৈরি করুন, যেমন `shakib-minecraft-bot`।
2. ZIP extract করুন।
3. `.env` ফাইলটি repository-তে দেবেন না; `.gitignore`-এ এটি বাদ আছে।
4. GitHub ওয়েবসাইটে **Add file → Upload files** দিয়ে প্রজেক্টের ফাইলগুলো upload করুন।
5. `farm.json` ও `node_modules` upload করবেন না।
6. Commit changes করুন।

Termux/PC থেকে Git ব্যবহার করলে:

```bash
git init
git add .
git status
git commit -m "Initial Minecraft bot project"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_NAME/shakib-minecraft-bot.git
git push -u origin main
```

## Railway deployment

1. Railway-তে নতুন Project খুলুন।
2. **Deploy from GitHub Repo** বেছে নিয়ে repository connect করুন।
3. Service → **Variables**-এ নিচের variables যোগ করুন:

```env
MC_HOST=secretsmp118.mcsh.io
MC_PORT=25565
MC_USERNAME=SHAKIB_00
OWNER_NAME=RIFAT_MOJO00
BOT_PASSWORD=YOUR_SERVER_LOGIN_PASSWORD
MC_VERSION=26.2
FARM_RADIUS=12
FARM_Y_RADIUS=6
RECONNECT_MS=10000
```

4. Build Command: `npm install`
5. Start Command: `npm start`
6. Deploy করুন এবং Deploy Logs দেখুন।

Railway-তে `.env` file upload না করে Variables ব্যবহার করুন। Railway filesystem restart/redeploy-এ স্থায়ী নাও থাকতে পারে; farm location `farm.json`-এ লেখা হয়। Deploy-এর পরে location হারালে bot-কে আবার farm-এ নিয়ে `!setfarm` দিন। Persistent Volume যুক্ত না করলে farm save স্থায়ী হবে এমন নিশ্চয়তা নেই।

## Android Termux setup

Termux-এর মধ্যে:

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts git unzip -y
node -v
npm -v
```

Node.js 22+ লাগবে; Node.js 24 ব্যবহার করতে পারেন। এরপর:

```bash
unzip minecraft-player-bot.zip
cd minecraft-player-bot
cp .env.example .env
nano .env
```

`.env`-এ `BOT_PASSWORD` বসিয়ে save করুন। তারপর:

```bash
npm install
npm run check
npm start
```

অথবা `bash start.sh` চালান। Stop করতে `Ctrl+C` দিন।

## Troubleshooting

### `Unsupported protocol version` / version mismatch
- Server সত্যিই Java 26.2 চালাচ্ছে কি না নিশ্চিত করুন।
- `MC_VERSION=26.2` আছে কি না দেখুন।
- `npm install` সফল হয়েছে কি না এবং `@wp2508/mineflayer` dependency এসেছে কি না যাচাই করুন।
- Compatibility fork upstream official Mineflayer নয়; সমস্যা হলে fork-এর release notes/issues দেখুন।

### `BOT_PASSWORD is empty`
- Railway Variables-এ `BOT_PASSWORD` যোগ করুন অথবা Termux-এর `.env` ঠিক করুন।
- Password কখনো chat-এ বা public log-এ দেবেন না।

### Bot join করে আবার disconnect হয়
- Host/port, server status, whitelist, server version ও server rules পরীক্ষা করুন।
- Server bot connection অনুমোদন করে কি না যাচাই করুন।
- `kicked` log-এর reason পড়ুন; বারবার দ্রুত reconnect না করে server-side restriction ঠিক করুন।

### `!setfarm` / `!farm` কাজ করছে না
- `OWNER_NAME`-এর spelling ও capitalization পরীক্ষা করুন। তুলনা case-insensitive।
- Owner account থেকে command পাঠান।
- Bot spawn হয়েছে কি না এবং console-এ error আছে কি না দেখুন।

### Cane কাটছে না
- `!setfarm` দিয়ে farm-এর কেন্দ্র ঠিকভাবে save করুন।
- Farm radius-এর মধ্যে cane আছে কি না দেখুন।
- Cane column কমপক্ষে ৩ ব্লক উঁচু হতে হবে।
- Farm chunks loaded এবং bot-এর কাছে block-breaking permission আছে কি না দেখুন।

### Chest-এ জমা হচ্ছে না
- ২৪ ব্লকের মধ্যে chest/trapped chest রাখুন।
- Chest accessible, unlocked এবং plugin-protected নয় কি না পরীক্ষা করুন।
- Inventory-তে sugar cane আছে কি না দেখুন।

### `npm install` failure
```bash
node -v
npm -v
npm cache verify
npm install
```
Node.js 22+ ব্যবহার করুন। Dependency download/network বা npm registry সমস্যা হলে পরে আবার install করুন।

## Security

- `.env` ও password GitHub-এ commit করবেন না।
- `.env.example`-এ আসল password দেবেন না।
- Server owner/admin-এর অনুমতি ছাড়া bot চালাবেন না।
- এই project কোনো server protection, anti-cheat বা access control bypass করার জন্য নয়।
