const fs = require('fs');
const path = require('path');

function ensureEnvFile(exampleRelativePath, targetRelativePath) {
  const rootDir = path.resolve(__dirname, '..');
  const examplePath = path.join(rootDir, exampleRelativePath);
  const targetPath = path.join(rootDir, targetRelativePath);

  if (!fs.existsSync(targetPath)) {
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, targetPath);
      console.log(`[Setup] Created ${targetRelativePath} from ${exampleRelativePath}`);
    } else {
      console.warn(`[Setup] Warning: ${exampleRelativePath} not found.`);
    }
  } else {
    console.log(`[Setup] Verified ${targetRelativePath} already exists.`);
  }
}

// Ensure .env files for server, app, and root
ensureEnvFile('server/.env.example', 'server/.env');
ensureEnvFile('app/.env.example', 'app/.env');
ensureEnvFile('.env.example', '.env');
