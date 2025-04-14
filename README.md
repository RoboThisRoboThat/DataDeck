# Data Deck - Open Source Desktop Application

Data Deck is an open source desktop application built with Electron, React, TypeScript, and Vite.

## Building the Application

Since Data Deck is open source and distributed as source code, users need to build the application locally. Follow these simple steps to build Data Deck on your machine:

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (comes with Node.js)

### Build Instructions

#### Easy Method

1. For Windows: Double-click the `build.bat` file
2. For macOS: Open Terminal in the project directory and run `./build.sh`

The build script will:
- Install any missing dependencies
- Build the application for your operating system
- Open the folder containing the built application when complete

The final application will be available at:
- macOS: `release/0.0.0/datadeck.dmg`
- Windows: `release/0.0.0/Data Deck-Windows-0.0.0-Setup.exe`

#### Manual Method

If you prefer to run the commands manually:

```bash
# Install dependencies
npm install

# Build for your platform
npm run build:app

# Or build for a specific platform
npm run build:mac  # macOS
npm run build:win  # Windows
npm run build:all  # All platforms (requires appropriate build tools)
```

## Development

```bash
# Start the development server
npm run dev
```

## Keyboard Shortcuts

See [KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md) for a complete list of keyboard shortcuts.

## License

This is an open source project, freely available for use and modification.

## Original Vite README

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
