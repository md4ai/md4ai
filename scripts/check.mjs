import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function run(command, name) {
  console.log(`${colors.cyan}▶ Running ${name}...${colors.reset}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`${colors.green}✔ ${name} passed${colors.reset}\n`);
    return true;
  } catch (e) {
    console.error(`${colors.red}✘ ${name} failed${colors.reset}\n`);
    return false;
  }
}

async function main() {
  console.log(`${colors.yellow}========================================`);
  console.log(`   md4ai Pre-Publish Build Checks`);
  console.log(`========================================${colors.reset}\n`);

  const steps = [
    { name: 'Library Build', cmd: 'npm run build' },
    { name: 'Typecheck', cmd: 'npm run typecheck' },
    { name: 'Unit Tests', cmd: 'npm run test' },
    { name: 'Demo Build', cmd: 'npm run build:demo' },
  ];

  let allPassed = true;
  for (const step of steps) {
    if (!run(step.cmd, step.name)) {
      allPassed = false;
      break;
    }
  }

  if (allPassed) {
    console.log(`${colors.cyan}▶ Verifying Agent Docs...${colors.reset}`);
    const llmsTxt = './examples/demo/public/llms.txt';
    const llmsFull = './examples/demo/public/llms-full.txt';
    
    const llmsExists = existsSync(llmsTxt);
    const llmsFullExists = existsSync(llmsFull);

    if (llmsExists && llmsFullExists) {
      console.log(`${colors.green}✔ Agent docs present in deployment folder${colors.reset}\n`);
    } else {
      if (!llmsExists) console.error(`${colors.red}✘ Missing ${llmsTxt}${colors.reset}`);
      if (!llmsFullExists) console.error(`${colors.red}✘ Missing ${llmsFull}${colors.reset}`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log(`${colors.green}✅ ALL CHECKS PASSED. Ready to publish!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ SOME CHECKS FAILED. Please fix issues before publishing.${colors.reset}`);
    process.exit(1);
  }
}

main();
