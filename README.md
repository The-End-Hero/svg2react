# SVG to React Component

A powerful online tool that converts SVG files into reusable React components. Supports TypeScript and JavaScript with real-time preview and code generation.

## ✨ Features

- 🎨 **Drag & Drop Upload** - Support drag and drop SVG files for conversion
- 🔄 **Real-time Preview** - Live preview of SVG effects during conversion
- 🎯 **Smart Conversion** - Automatically converts SVG attributes to React-compatible format
- 🎨 **Color Customization** - Support custom preview colors and sizes
- 📝 **Code Generation** - Generate TypeScript or JavaScript React component code
- 📋 **One-click Copy** - Generated code can be copied to clipboard with one click
- 🎨 **Syntax Highlighting** - Code display with syntax highlighting
- 📱 **Responsive Design** - Perfect adaptation for desktop and mobile devices

## 🚀 Quick Start

### Online Usage

Visit the [live version](https://svg2react.vercel.app) to start using it directly.

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/The-End-Hero/svg2react.git
   cd svg2react
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Build for production**
   ```bash
   pnpm build
   ```

## 🛠️ Tech Stack

- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **Drag & Drop**: React Dropzone
- **Code Highlighting**: Prism React Renderer
- **Animations**: Motion
- **State Management**: Zustand
- **Utilities**: ahooks, lodash-es, dayjs
- **Package Manager**: pnpm

## 📖 Usage Guide

### Basic Usage

1. **Upload SVG File**
   - Drag and drop SVG file to the page area
   - Or click anywhere on the page to select a file

2. **Preview and Adjust**
   - View SVG preview effect
   - Adjust colors and sizes
   - Modify component name

3. **Generate Code**
   - Choose output format (TSX/JSX)
   - Copy the generated React component code

### Advanced Features

- **Smart Attribute Conversion**: Automatically converts SVG attributes to React-compatible format
- **Color Handling**: Intelligently handles `fill` and `stroke` attributes, supports `currentColor`
- **Type Safety**: TypeScript version provides complete type definitions
- **Accessibility**: Supports `title` attribute for improved accessibility

## 🎯 Generated Component Features

The generated React components have the following features:

- ✅ Support for all SVG attributes
- ✅ Responsive size control
- ✅ Color theme support
- ✅ TypeScript type safety
- ✅ Accessibility support
- ✅ Performance optimization

## 📁 Project Structure

```
svg2react/
├── public/                 # Static assets
├── src/
│   ├── pages/             # Page components
│   │   └── svg-converter/ # SVG converter page
│   ├── App.tsx            # App entry point
│   └── main.tsx           # App startup
├── package.json           # Project configuration
└── README.md             # Project documentation
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Thanks to all the developers who contributed to this project!

---

⭐ If this project helps you, please give it a star!
