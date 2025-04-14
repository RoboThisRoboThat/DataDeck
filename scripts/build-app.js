#!/usr/bin/env node

/**
 * Data Deck Build Script
 * This script builds the Data Deck application and opens the release folder when complete
 */

import { spawn, exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';
import process from 'node:process';

// Determine the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Define a basic colored output function until chalk is available
const basicColors = {
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`
};

// Install packages by adding them to package.json temporarily and then removing them
async function installRequiredPackages() {
    const requiredPackages = ['ora', 'chalk', 'open'];
    console.log(basicColors.blue('Installing required dependencies...'));

    try {
        // First, install all packages to node_modules (use --save to add them to package.json temporarily)
        await new Promise((resolve, reject) => {
            const cmd = `npm install ${requiredPackages.join(' ')} --save`;
            console.log(basicColors.yellow(`Running: ${cmd}`));

            exec(cmd, { cwd: rootDir }, (error, stdout) => {
                if (error) {
                    console.error(basicColors.red(`Failed to install packages: ${error.message}`));
                    reject(error);
                } else {
                    console.log(basicColors.green('Packages installed successfully'));
                    resolve(stdout);
                }
            });
        });

        return true;
    } catch (error) {
        console.error(basicColors.red(`Failed to install dependencies: ${error.message}`));
        process.exit(1);
    }
}

// Cleanup package.json after build is complete
async function cleanupPackages() {
    const requiredPackages = ['ora', 'chalk', 'open'];
    console.log(basicColors.blue('Cleaning up temporary dependencies...'));

    try {
        // Remove the packages from package.json
        await new Promise((resolve, reject) => {
            const cmd = `npm uninstall ${requiredPackages.join(' ')} --save`;

            exec(cmd, { cwd: rootDir }, (error) => {
                if (error) {
                    console.error(basicColors.red(`Failed to uninstall packages: ${error.message}`));
                    reject(error);
                } else {
                    console.log(basicColors.green('Cleanup completed successfully'));
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error(basicColors.red(`Warning: Failed to cleanup dependencies: ${error.message}`));
        // Don't exit on cleanup failure, as the build is already complete
    }
}

// Get the version from package.json
function getAppVersion() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    return packageJson.version || '0.0.0';
}

// Function to build the app based on the platform
async function buildApp() {
    // Import ora for the spinner
    let ora;
    try {
        ora = (await import('ora')).default;
    } catch (error) {
        console.error(basicColors.red(`Error importing ora: ${error.message}`));
        process.exit(1);
    }

    const spinner = ora('Building Data Deck...').start();
    const currentPlatform = platform();
    const buildCommand = currentPlatform === 'win32' ? 'build:win' : 'build:mac';

    spinner.text = `Building for ${currentPlatform === 'win32' ? 'Windows' : 'macOS'}...`;

    return new Promise((resolve, reject) => {
        const buildProcess = spawn('npm', ['run', buildCommand], {
            cwd: rootDir,
            shell: true,
            stdio: 'pipe'
        });

        let buildOutput = '';

        buildProcess.stdout.on('data', (data) => {
            const output = data.toString();
            buildOutput += output;

            if (output.includes('packaging')) {
                spinner.text = 'Packaging application...';
            } else if (output.includes('building')) {
                spinner.text = 'Building application...';
            }
        });

        buildProcess.stderr.on('data', (data) => {
            buildOutput += data.toString();
        });

        buildProcess.on('error', (error) => {
            spinner.fail(`Build failed: ${error.message}`);
            reject(error);
        });

        buildProcess.on('close', (code) => {
            if (code === 0) {
                spinner.succeed('Build completed successfully!');
                resolve();
            } else {
                spinner.fail(`Build failed with code ${code}`);
                console.error('Build output:', buildOutput);
                reject(new Error(`Build process exited with code ${code}`));
            }
        });
    });
}

// Open installer file directly without opening the folder
async function openReleaseFolder() {
    // Import modules
    let chalk;
    let open;
    try {
        chalk = (await import('chalk')).default;
        open = (await import('open')).default;
    } catch (error) {
        console.error(basicColors.red(`Error importing modules: ${error.message}`));
        return;
    }

    const version = getAppVersion();
    const releaseDir = path.join(rootDir, 'release', version);

    if (!fs.existsSync(releaseDir)) {
        console.error(chalk.red(`Release directory not found: ${releaseDir}`));
        return;
    }

    // Find the built app file
    const isWindows = platform() === 'win32';
    const filePrefix = isWindows ? 'Data Deck-Windows' : 'Data Deck-Mac';
    const fileExt = isWindows ? '.exe' : '.dmg';

    // Look for the installer file
    const files = fs.readdirSync(releaseDir);
    const installerFile = files.find(file =>
        file.includes(filePrefix) && file.endsWith(fileExt)
    );

    if (!installerFile) {
        console.error(chalk.yellow(`Installer file not found in ${releaseDir}`));
        console.log(chalk.blue('Available files:'));
        for (const file of files) {
            console.log(`- ${file}`);
        }

        // If installer not found, then open the folder so user can see the files
        try {
            await open(releaseDir);
            console.log(chalk.green(`Release folder opened: ${releaseDir}`));
        } catch (err) {
            console.error(chalk.red(`Failed to open release folder: ${err.message}`));
        }
        return;
    }

    const installerPath = path.join(releaseDir, installerFile);

    // Open the installer file directly
    try {
        console.log(chalk.cyan(`Opening installer: ${installerFile}`));
        await open(installerPath);
        console.log(chalk.green('Installer opened successfully!'));
        console.log(chalk.blue(`Installer location: ${installerPath}`));
    } catch (err) {
        console.error(chalk.red(`Failed to open installer: ${err.message}`));
        console.log(chalk.yellow(`You can manually open the installer at: ${installerPath}`));

        // If opening the installer fails, then open the folder
        try {
            await open(releaseDir);
            console.log(chalk.green(`Release folder opened: ${releaseDir}`));
        } catch (folderErr) {
            console.error(chalk.red(`Failed to open release folder: ${folderErr.message}`));
        }
    }
}

// Main function
async function main() {
    try {
        console.log(basicColors.blue('=== Data Deck Application Builder ==='));

        // First, install all required dependencies
        await installRequiredPackages();

        // Now we can safely import and use chalk
        const chalk = (await import('chalk')).default;
        console.log(chalk.blue('=== Data Deck Application Builder ==='));

        // Build the app
        await buildApp();

        console.log(chalk.green('\n✨ Data Deck build complete! ✨'));

        // Open the release folder
        await openReleaseFolder();

        // Clean up the temporary packages
        await cleanupPackages();

    } catch (error) {
        console.error(basicColors.red(`\nBuild failed: ${error.message}`));

        // Try to clean up even on error
        try {
            await cleanupPackages();
        } catch (cleanupError) {
            // Just ignore cleanup errors at this point
        }

        process.exit(1);
    }
}

main(); 