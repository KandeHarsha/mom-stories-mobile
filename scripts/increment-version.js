#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get version type from command line argument (default: patch)
const versionType = process.argv[2] || 'patch';

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Parse current version
const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.').map(Number);

// Increment version based on type
switch (versionType) {
  case 'major':
    versionParts[0] += 1;
    versionParts[1] = 0;
    versionParts[2] = 0;
    break;
  case 'minor':
    versionParts[1] += 1;
    versionParts[2] = 0;
    break;
  case 'patch':
  default:
    versionParts[2] += 1;
    break;
}

// Create new version string
const newVersion = versionParts.join('.');

// Update package.json
packageJson.version = newVersion;

// Write back to package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version updated from ${currentVersion} to ${newVersion} (${versionType})`);