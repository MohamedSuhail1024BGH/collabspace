# Progress Capsule - CollabSpace

## Current Status & Progress Summary
The CollabSpace project is currently an active Next.js application (version 16.3.1) using React 19.
Recent work includes significant additions to authentication, dashboard clients, database integration with Drizzle ORM, and End-to-End testing with Playwright.

### Completed Features & Uncommitted Changes (as of Backup)
- **Database Integration**: Added `drizzle-orm` and `better-sqlite3`. Configured in `drizzle.config.ts` and `lib/db/`.
- **E2E Testing**: Integrated Playwright (`@playwright/test`) and configured in `playwright.config.ts` and `tests/`.
- **Client Components Migration**: Separated client logic into dedicated client components:
  - `CalendarClient.tsx`
  - `MessagesClient.tsx`
  - `ProjectsClient.tsx`
  - `SettingsClient.tsx`
  - `TasksClient.tsx`
  - `WorkspaceSwitcher.tsx`
- **Authentication**: Added login/signup pages and `components/auth/` components.
- **Server Actions**: Introduced `app/actions.ts`.
- **Node Environment**: Locked Node.js version to v22 via `.nvmrc`.

## System Requirements
- **Node.js**: v22 (recommended to manage via `nvm`)
- **Package Manager**: npm

## Recovery Guide (Moving to a new Linux Distribution)

### 1. Prerequisites Installation
After installing your new Linux distribution, ensure you have Git, NVM, and VS Code installed.

**Install Git:**
```bash
sudo apt update
sudo apt install git
```

**Install NVM and Node.js:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
# Restart your terminal or source ~/.bashrc
nvm install 22
nvm use 22
```

**Install Visual Studio Code:**
Follow the official documentation or install via snap:
```bash
sudo snap install code --classic
```

### 2. Restoring the Project from GitHub
Open your terminal and clone the repository:
```bash
git clone <YOUR_GITHUB_REPOSITORY_URL> collabspace
cd collabspace
```

### 3. Setup the Project Environment
Once inside the project directory, install dependencies and setup the database.

```bash
# Ensure you are on the correct Node.js version
nvm use

# Install dependencies
npm install

# Setup Database
npm run db:push
npm run db:seed
```

### 4. Running the Application in VS Code
Open the project in VS Code:
```bash
code .
```

Start the development server:
```bash
npm run dev
```

Run tests to ensure everything is working:
```bash
npm run test:e2e
```

## IDE & Editor Settings (VS Code)
Make sure you have the following VS Code Extensions for the best developer experience:
- **ESLint**
- **Tailwind CSS IntelliSense**
- **Playwright Test for VSCode**

This capsule guarantees that your transition to the new Linux distribution will be smooth and no progress is lost.
