"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const unzipper = __importStar(require("unzipper"));
const child_process_1 = require("child_process");
function activate(context) {
    let disposable = vscode.commands.registerCommand('wordpress-installer.installWordPress', () => {
        vscode.window.showInformationMessage('Starting WordPress installation...');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a folder in the workspace to install WordPress.');
            return;
        }
        // Set the directory to download WordPress to
        const outputDir = workspaceFolder.uri.fsPath;
        const zipFilePath = path.join(outputDir, 'wordpress.zip');
        // Step 1: Download WordPress
        downloadWordPress(zipFilePath, outputDir);
    });
    context.subscriptions.push(disposable);
}
function downloadWordPress(zipFilePath, outputDir) {
    const url = 'https://wordpress.org/latest.zip';
    vscode.window.showInformationMessage('Downloading WordPress...');
    const file = (0, fs_1.createWriteStream)(zipFilePath);
    https.get(url, response => {
        response.pipe(file);
        file.on('finish', () => {
            file.close(() => {
                vscode.window.showInformationMessage('WordPress downloaded successfully.');
                // Confirm that the file exists before unzipping
                if ((0, fs_1.existsSync)(zipFilePath)) {
                    vscode.window.showInformationMessage('WordPress zip file exists. Proceeding to unzip...');
                    unzipWordPress(zipFilePath, outputDir);
                }
                else {
                    vscode.window.showErrorMessage('WordPress zip file not found. Please try downloading again.');
                }
            });
        });
    }).on('error', err => {
        vscode.window.showErrorMessage(`Error downloading WordPress: ${err.message}`);
    });
}
function unzipWordPress(zipFilePath, outputDir) {
    vscode.window.showInformationMessage('Unzipping WordPress...');
    (0, fs_1.createReadStream)(zipFilePath)
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
        const fileName = entry.path;
        // Only extract the files that are inside the 'wordpress/' folder
        if (fileName.startsWith('wordpress/')) {
            const filePath = fileName.replace('wordpress/', ''); // Remove 'wordpress/' from the path
            const outputPath = path.join(outputDir, filePath);
            // If the entry is a file, extract it to the output directory
            if (entry.type === 'File') {
                entry.pipe(require('fs').createWriteStream(outputPath));
            }
            else {
                // If it's a directory, just auto-create it
                require('fs').mkdirSync(outputPath, { recursive: true });
                entry.autodrain();
            }
        }
        else {
            entry.autodrain(); // Skip files that are not in 'wordpress/' folder
        }
    })
        .on('close', () => {
        vscode.window.showInformationMessage('WordPress unzipped successfully.');
        promptForConfig(outputDir); // Proceed to setup wp-config.php
        deleteZipFile(zipFilePath);
    })
        .on('error', (err) => {
        vscode.window.showErrorMessage(`Error unzipping WordPress: ${err.message}`);
        console.error('Unzipping error:', err); // Log error details to console for debugging
    });
}
// Function to delete the ZIP file
function deleteZipFile(zipFilePath) {
    (0, fs_1.unlink)(zipFilePath, (err) => {
        if (err) {
            vscode.window.showErrorMessage(`Error deleting WordPress ZIP file: ${err.message}`);
        }
        else {
            vscode.window.showInformationMessage('WordPress ZIP file deleted successfully.');
        }
    });
}
// Step 3: Prompt user for database details
async function promptForConfig(outputDir) {
    try {
        // Prompt for database name
        const dbName = await vscode.window.showInputBox({
            prompt: 'Enter Database Name',
            placeHolder: 'e.g., wordpress_db',
            ignoreFocusOut: true
        });
        if (!dbName) {
            vscode.window.showErrorMessage('Database name is required.');
            return;
        }
        // Prompt for database user
        const dbUser = await vscode.window.showInputBox({
            prompt: 'Enter Database User',
            placeHolder: 'e.g., root',
            ignoreFocusOut: true
        });
        if (!dbUser) {
            vscode.window.showErrorMessage('Database user is required.');
            return;
        }
        // Prompt for database password
        const dbPassword = await vscode.window.showInputBox({
            prompt: 'Enter Database Password',
            placeHolder: 'e.g., password123',
            ignoreFocusOut: true,
            password: true // This masks the input
        });
        if (!dbPassword) {
            vscode.window.showErrorMessage('Database password is required.');
            return;
        }
        // Now proceed to create wp-config.php with these values
        setupConfig(outputDir, dbName, dbUser, dbPassword);
    }
    catch (error) {
        // Use type guard to check if error is an instance of Error
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Error setting up configuration: ${error.message}`);
        }
        else {
            vscode.window.showErrorMessage(`Unknown error occurred during configuration setup.`);
        }
    }
}
function setupConfig(outputDir, dbName, dbUser, dbPassword) {
    const sampleConfig = path.join(outputDir, 'wp-config-sample.php');
    const config = path.join(outputDir, 'wp-config.php');
    vscode.window.showInformationMessage('Setting up wp-config.php...');
    try {
        // Read the sample config file
        let configContent = (0, fs_1.readFileSync)(sampleConfig, 'utf-8');
        // Replace placeholders with actual database info
        configContent = configContent
            .replace('database_name_here', dbName)
            .replace('username_here', dbUser)
            .replace('password_here', dbPassword);
        // Write the updated config file
        (0, fs_1.writeFileSync)(config, configContent);
        vscode.window.showInformationMessage('wp-config.php created successfully.');
        // After setting up config, prompt for theme creation and Git initialization
        postConfigPrompts(outputDir);
    }
    catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Error setting up wp-config.php: ${error.message}`);
        }
        else {
            vscode.window.showErrorMessage(`Unknown error occurred during wp-config.php setup.`);
        }
    }
}
// Function to prompt for theme creation and Git initialization
async function postConfigPrompts(outputDir) {
    let themeDir = '';
    // Prompt if the user wants to create a theme folder
    const createTheme = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Do you want to create a custom theme folder?',
    });
    if (createTheme === 'Yes') {
        const themeName = await vscode.window.showInputBox({
            prompt: 'Enter a name for your theme',
            placeHolder: 'e.g., my-theme',
            ignoreFocusOut: true
        });
        if (themeName) {
            themeDir = path.join(outputDir, 'wp-content', 'themes', themeName);
            if (!(0, fs_1.existsSync)(themeDir)) {
                (0, fs_1.mkdirSync)(themeDir, { recursive: true });
                vscode.window.showInformationMessage(`Theme folder '${themeName}' created successfully.`);
            }
            else {
                vscode.window.showWarningMessage(`Theme folder '${themeName}' already exists.`);
            }
            // Prompt if the user wants to clone a theme template from a Git repository
            const cloneTheme = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: 'Do you want to clone a theme template from a Git repository?',
            });
            if (cloneTheme === 'Yes') {
                const repoUrl = await vscode.window.showInputBox({
                    prompt: 'Enter the Git repository URL of the theme template',
                    placeHolder: 'https://github.com/example/theme-template.git',
                    ignoreFocusOut: true
                });
                if (repoUrl) {
                    vscode.window.showInformationMessage(`Cloning theme from ${repoUrl}...`);
                    cloneThemeTemplate(repoUrl, themeDir);
                }
            }
        }
    }
    // Prompt if the user wants to initialize Git in the theme directory
    const initializeGit = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Do you want to initialize a Git repository inside the theme folder?',
    });
    if (initializeGit === 'Yes' && themeDir) {
        initializeGitRepo(themeDir); // Initialize Git inside the theme folder
    }
    else if (initializeGit === 'Yes' && !themeDir) {
        vscode.window.showWarningMessage('No theme folder was created, skipping Git initialization.');
    }
}
function cloneThemeTemplate(repoUrl, themeDir) {
    (0, child_process_1.exec)(`git clone ${repoUrl} ${themeDir}`, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage(`Error cloning theme template: ${stderr}`);
        }
        else {
            vscode.window.showInformationMessage('Theme template cloned successfully.');
        }
    });
}
// Function to initialize Git
function initializeGitRepo(themeDir) {
    (0, child_process_1.exec)('git init', { cwd: themeDir }, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage(`Error initializing Git in theme folder: ${stderr}`);
        }
        else {
            vscode.window.showInformationMessage('Git repository initialized successfully inside the theme folder.');
        }
    });
}
function deactivate() { }
//# sourceMappingURL=extension.js.map