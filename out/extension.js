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
        .pipe(unzipper.Parse() // Parse the zip file content
    )
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
    // Now the files are directly in the output directory, not in 'wordpress/' folder
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
    }
    catch (err) {
        if (err instanceof Error) {
            vscode.window.showErrorMessage(`Error setting up wp-config.php: ${err.message}`);
        }
        else {
            vscode.window.showErrorMessage(`Unknown error occurred during wp-config.php setup.`);
        }
    }
    // Step 4: Optionally set up the database
    // setupDatabase(dbName, dbUser, dbPassword);
    // Step 5: Open the installation page in the browser
    // openInBrowser();
}
// function setupDatabase(dbName: string, dbUser: string, dbPassword: string) {
//     vscode.window.showInformationMessage('Setting up the database...');
//     const createDbCommand = `mysql -u ${dbUser} -p${dbPassword} -e "CREATE DATABASE IF NOT EXISTS ${dbName};"`;
//     exec(createDbCommand, (error, stdout, stderr) => {
//         if (error) {
//             vscode.window.showErrorMessage(`Error setting up the database: ${stderr}`);
//         } else {
//             vscode.window.showInformationMessage('Database setup successfully.');
//         }
//     });
// }
// async function openInBrowser() {
//     const url = 'http://localhost/wordpress';  // Modify this based on where WordPress is installed
//     // Dynamically import the 'open' module
//     const open = (await import('open')).default;
//     open(url);
//     vscode.window.showInformationMessage('Opening WordPress installation in your browser...');
// }
function deactivate() { }
//# sourceMappingURL=extension.js.map