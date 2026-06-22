# Friendly Environment Setup

Use this when setting up a new employee machine for Pixelbuddha Adobe Stock automation. Start by asking whether to continue in English or Russian, then proceed in small steps. The employee may not know what a terminal, package manager, or environment variable is.

## Setup Style

- Explain what you are checking before running commands.
- Prefer one small block of commands at a time.
- After each block, interpret the result in plain language.
- Ask for approval before installing software, changing shell configuration, or writing credentials.
- Never print Dropbox secrets.
- If a command fails, explain the likely cause and offer the next safest path.

## Required Tools

The automation needs:

- Git: clones and updates the automation repository.
- Node.js 18 or newer: runs Dropbox fetch scripts. Node 22 is known good.
- Python 3.10 or newer: runs image/report/packaging scripts. Python 3.12 is known good.
- Pillow: Python image library for `Preview1.jpg` generation.
- ripgrep: fast repo search.
- An AI agent interface that can read files and run shell commands. This can be Codex, Claude Code, a DeepSeek-powered coding agent, or another compatible local/remote agent.

Check tools:

```sh
git --version
node --version
python3 --version
rg --version
python3 -c "import PIL; print(PIL.__version__)"
```

On Windows, use:

```powershell
git --version
node --version
py --version
rg --version
py -c "import PIL; print(PIL.__version__)"
```

## macOS Install Path

If Homebrew exists:

```sh
brew --version
brew install git node python ripgrep
python3 -m pip install --user Pillow
```

If Homebrew is missing, ask before installing it. If Git is missing, macOS may prompt to install Command Line Tools:

```sh
xcode-select --install
```

After installation, open a new terminal and re-run the checks.

## Windows Install Path

Use PowerShell. First check if `winget` exists:

```powershell
winget --version
```

If `winget` works, install missing tools:

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Python.Python.3.12 -e
winget install --id BurntSushi.ripgrep.MSVC -e
py -m pip install --user Pillow
```

Close and reopen PowerShell, then re-run the checks. If `py` is unavailable but `python` works, use:

```powershell
python -m pip install --user Pillow
```

If `winget` is unavailable, guide the employee through official installers for Git, Node.js LTS, Python, and ripgrep. Keep the conversation calm and one installer at a time.

## Linux Install Path

Use the system package manager. For Debian/Ubuntu:

```sh
sudo apt update
sudo apt install git nodejs npm python3 python3-pip ripgrep
python3 -m pip install --user Pillow
```

If Node.js from the distro is older than 18, use the platform's preferred Node LTS installer or ask before adding a new package source.

## Generic AI Agent Setup

Use this path for DeepSeek-powered agents or any other compatible coding agent that is not Codex or Claude Code.

Minimum agent capabilities:

- Read Markdown files from the repository.
- Run shell commands in the repository folder.
- Edit files when the workflow requires it.
- Ask the employee for approval before installing software, writing credentials, or deleting files.

Provider-specific API keys are not required by this automation. The AI model provider only affects the chat/coding interface; the workflow itself runs through local Node.js and Python scripts plus Dropbox credentials.

Point the agent to this file first:

```text
skills/pixelbuddha-adobe-stock-automation/SKILL.md
```

Then ask it to follow the skill from the repository root. If the agent has no native "skill" feature, it can still operate by reading `SKILL.md` and loading referenced files only when needed.

If the employee asks to update the skill, update the local copy from GitHub only. Do not commit or push from an employee machine.

## Claude Code Setup

If the employee will use Claude, verify Claude Code after Node.js is installed:

```sh
claude --version
```

If Claude Code is missing, install it with npm:

```sh
npm install -g @anthropic-ai/claude-code
```

Do not use `sudo npm install -g`. If global npm permissions fail, fix npm's user-level prefix or use the official Claude Code installer path for the employee's OS. After installation, start Claude Code from the repository root:

```sh
claude
```

On first launch, Claude Code will ask the employee to authenticate.

## Repository Setup

Clone or open the repository:

```sh
git clone https://github.com/pbuddha-team/Adobe-Stock-Auto.git
cd Adobe-Stock-Auto
```

For an existing clone, get the latest approved skill and scripts:

```sh
git pull
```

Create local credentials from the example:

```sh
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Tell the employee to paste Dropbox credentials into `.env` without sharing them in chat.

## Dropbox Credentials

Required:

```text
DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=
DROPBOX_REFRESH_TOKEN=
DROPBOX_AUTO_JSON_PATH=/Products/auto.json
DROPBOX_MAX_PSD_MB=500
STEP1_LOG_PATH=step1-log.json
```

Optional:

```text
DROPBOX_RE_AUTO_JSON_PATH=/Products/re_auto.json
DROPBOX_BATCH_ROOT=.
DROPBOX_PRODUCTS_ROOT=/Pixelbuddha/Products
DROPBOX_SELECT_USER=
DROPBOX_PATH_ROOT_NAMESPACE_ID=
DROPBOX_SHARED_LINK_VISIBILITY=
```

Validate without downloading:

```sh
node scripts/dropbox-products.mjs step1 --dry-run
```

Windows PowerShell uses the same command:

```powershell
node scripts/dropbox-products.mjs step1 --dry-run
```

## Claude Install Paths

Claude Code discovers skills from:

- Project skills: `.claude/skills/<skill-name>/SKILL.md`
- Personal skills: `~/.claude/skills/<skill-name>/SKILL.md`

This repository includes a project skill at:

```text
.claude/skills/pixelbuddha-adobe-stock-automation/SKILL.md
```

For a personal install, copy the whole skill folder:

```sh
mkdir -p ~/.claude/skills
cp -R .claude/skills/pixelbuddha-adobe-stock-automation ~/.claude/skills/
```

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills"
Copy-Item -Recurse .claude\skills\pixelbuddha-adobe-stock-automation "$env:USERPROFILE\.claude\skills\"
```

Then start Claude Code from the repository root or any folder below it.
