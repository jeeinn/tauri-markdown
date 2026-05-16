# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.1] - 2026-05-16

### Fixed
- **Editor Theme Reset**: Fixed theme not applying correctly when switching between edit/preview/Zen modes
- **Language Switch Theme**: Optimized theme management logic during language switching

### Changed
- **Code Refactoring**: Extracted mode switch listener into independent module for better maintainability
- **Component Structure**: Optimized MyVditor component structure and code organization
- **Theme Subscription**: Enhanced theme subscription logic with improved debuggability

## [0.5.0] - 2026-05-15

### Added
- **Zen Mode**: Implement immersive Zen mode for distraction-free writing experience
- **Save Prompt on Close**: Add unsaved changes detection with confirmation dialog when closing window or opening new file
- **PDF Page Break Optimization**: Enhanced PDF export to prevent content from being cut horizontally across pages

### Fixed
- **Content Change Detection**: Fixed issue where inserting images incorrectly showed "content not modified" message

## [0.4.0] - 2026-05-13

### Added
- **PDF Export**: Export markdown to PDF with formatting preserved
- **HTML Export**: Export markdown to HTML for web sharing
- **Drag & Drop File Open**: Drag .md/.markdown/.txt files directly into the app to open
- **Scroll Position Memory**: Remember and restore scroll position when reopening documents (toggleable)

### Fixed
- **Network Image 403**: Fixed third-party image loading issues by adding no-referrer policy
- **Export Functionality**: Fixed i18n configuration and relative path image handling in exports

### Changed
- **Menu System**: Restructured menu with nested submenus and group titles for better organization
- **Language Switcher**: Replaced dropdown with select component for more intuitive language switching
- **Testing**: Migrated to Vitest framework for better test coverage
- **Code Organization**: Modularized scroll memory and export utilities

## [0.3.2] - 2026-05-10

### Added
- **File Association Support**: Double-click .md/.markdown files to open directly in the app (Windows/Linux/macOS)
- **View Logs Feature**: Added "View Logs" option in Help menu to quickly access application logs
- **Tauri 2.11.1 Upgrade**: Updated to latest Tauri version with improved stability and performance

### Changed
- **macOS Integration**: Added Info.plist for proper macOS file association support
- **Code Refactoring**: Extracted common file loading logic to reduce code duplication
- **Logging System**: Enhanced logging with cross-platform log directory support

## [0.3.1] - 2026-05-09

### Added
- **Custom tmd Protocol**: Render relative-path images in the editor via a custom `tmd://` protocol
- **File Upload Support**: Separate file upload from image upload, supporting more file types

### Fixed
- **Relative Path Images**: Support rendering images from any directory with relative paths
- **Upload Prompts**: Remove "image-only" wording to fit file upload scenarios
- **Chromium URL Normalize**: Strip `./` prefix from tmd URLs to avoid Chromium normalization issues
- **Unsaved Document Upload**: Prompt user to save the document before uploading when file is not yet saved

### Changed
- **tmd Protocol Optimization**: Refined internal implementation of the custom protocol

## [0.3.0] - 2025-05-07

### Major Upgrades
- **Tauri 2.x Migration**: Upgraded from Tauri 1.x to 2.x with new plugin architecture
- **Vue 3.5+**: Updated to latest Vue 3 with improved performance
- **Vditor 3.11+**: Enhanced markdown editor with better features
- **Element Plus 2.13+**: Modern UI components

### Added
- **Image Upload Support**: Drag and drop or paste images directly into the editor with automatic asset management
- **File Export**: Export markdown files with Ctrl+Shift+S shortcut
- **Auto-reopen Last File**: Automatically opens the last edited file on startup
- **Dynamic Window Title**: Shows current file name and modification status in window title
- **Theme Switching**: Support for auto/light/dark themes with system preference detection
- **Multi-language Support**: Full i18n support for Chinese (Simplified/Traditional), English, Japanese, and Korean
- **Direct Save**: Press Ctrl+S to save files directly without dialog
- **New File Creation**: Create new markdown files with Ctrl+N
- **Enhanced Menu Bar**: Custom top application menu with keyboard shortcuts display

### Changed
- **Better Image Path Handling**: Smart path mapping for images using Tauri's asset protocol
- **Content Change Detection**: Tracks modifications to prevent unnecessary saves
- **Improved File Operations**: More reliable file open/save with proper error handling
- **Modern Build Tools**: Updated to Vite 8 and latest development dependencies

## [0.2.0] - 2022-09-25
Demo

[Unreleased]: https://github.com/jeeinn/tauri-markdown/compare/v0.5.1...HEAD
[0.5.1]: https://github.com/jeeinn/tauri-markdown/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/jeeinn/tauri-markdown/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/jeeinn/tauri-markdown/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/jeeinn/tauri-markdown/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/jeeinn/tauri-markdown/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/jeeinn/tauri-markdown/releases/tag/v0.3.0
