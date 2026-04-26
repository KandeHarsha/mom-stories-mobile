# OTA Deployment Guide

This guide explains how to deploy Over-The-Air (OTA) updates for the Mom Stories Mobile app.

## Quick Start

To deploy an OTA update with automatic version increment:

```bash
# Deploy a patch update (1.0.0 → 1.0.1)
npm run deploy:patch

# Deploy a minor update (1.0.0 → 1.1.0)
npm run deploy:minor

# Deploy a major update (1.0.0 → 2.0.0)
npm run deploy:major
```

## Custom Deployment

You can also provide a custom message:

```bash
# Deploy with custom message
node ./scripts/deploy-ota.js patch "Fixed login bug"
node ./scripts/deploy-ota.js minor "Added new features"
node ./scripts/deploy-ota.js major "Breaking changes"
```

## Manual Version Management

If you need to increment versions without deploying:

```bash
# Increment patch version only
npm run version:patch

# Increment minor version only
npm run version:minor

# Increment major version only
npm run version:major
```

## How It Works

1. **Version Increment**: The script automatically increments the version in `package.json`
2. **Config Update**: `app.config.ts` reads the version from `package.json`
3. **OTA Deployment**: EAS Update publishes the new version
4. **App Display**: The profile screen shows the current version using `Constants.expoConfig.version`

## Version Display

The current version is displayed in the app at:
- **Location**: Profile Screen (`app/profile/index.tsx`)
- **Source**: `Constants.expoConfig.version` (reads from `app.config.ts`)
- **Format**: "Version X.Y.Z"

## Deployment Process

When you run a deployment command, the following happens:

1. 📈 Version number is incremented in `package.json`
2. 📦 EAS Update builds and publishes the OTA update
3. 📱 Users receive the update automatically
4. ✅ New version is displayed in the app

## Environment Variants

The app supports different build variants:
- **Production**: `com.harshakande.momstories`
- **Preview**: `com.harshakande.momstories.preview`
- **Development**: `com.harshakande.momstories.dev`

Each variant maintains its own version number and update channel.

## Troubleshooting

If deployment fails:
1. Ensure you're logged into EAS CLI: `eas login`
2. Check your EAS project configuration
3. Verify your internet connection
4. Check the EAS dashboard for error details

## Best Practices

- Use **patch** updates for bug fixes
- Use **minor** updates for new features
- Use **major** updates for breaking changes
- Always test updates in preview/development before production
- Include meaningful commit messages and update descriptions