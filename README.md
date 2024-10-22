# WordPress Installer VSCode Extension

## About

**WordPress Installer** is a Visual Studio Code extension designed to help developers quickly set up a WordPress environment. It simplifies the process by automating tasks like downloading and extracting WordPress and configuring the necessary files—all from within VSCode.

No more manual downloads or switching to the terminal! With just a few commands, you can have a fresh WordPress installation ready to go.

## Features

- **Automatic WordPress Download**: Fetches and installs the latest version of WordPress.
- **Custom Configuration**: Prompts for necessary information (such as database details) and automatically configures the `wp-config.php` file.
- **Simple Setup Process**: User-friendly prompts to get WordPress installed and configured quickly.
- **No External Tools Required**: Everything works seamlessly within VSCode, no need for command-line utilities like `wp-cli`.

## Installation

1. **Install via VSCode**:
   - Open the **Extensions** view in Visual Studio Code (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS).
   - Search for "**WordPress Installer**" and click **Install**.

2. **Manual Installation**:
   - Clone the repository:
     ```bash
     git clone https://github.com/tbbais/wordpress-installer
     cd wordpress-installer
     npm install
     npm run compile
     ```

   - Open the project in VSCode and press `F5` to launch the extension in a new window.

## Usage

1. Open a folder where you want to install WordPress.
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS) and type `Install WordPress`.
3. Follow the prompts to provide the necessary details (like database name, user, password).
4. The extension will automatically:
   - Download the latest version of WordPress.
   - Extract it into your workspace folder.
   - Set up the `wp-config.php` file based on the provided details.

5. Once the process is complete, your local WordPress site will be ready to run!

## Contributing

Contributions are welcome! To get involved:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Make your changes and commit (`git commit -m 'Add feature'`).
4. Push to your branch (`git push origin feature/your-feature`).
5. Open a Pull Request, and we will review it together!

Feel free to open an issue if you find a bug or want to request a feature.

## License

This project is licensed under the **MIT License**. For more details, see the [LICENSE](./LICENSE) file.

## Support

If this extension helped you, consider [buying me a coffee](https://www.buymeacoffee.com/tbbais) to support further development!
