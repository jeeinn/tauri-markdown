# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.1] - 2026-05-26

### Added
- **Find and Replace**: Added find and replace functionality for text editing

### Fixed
- **Updater Progress Display**: Fixed Tauri updater download progress calculation
- **Vditor Code Copy Security**: Added dangerousDisableAssetCspModification config for script-src to enable code copy functionality
- **Find Button UI**: Improved find button UI and dark theme styling

## [0.6.0] - 2026-05-25

### Added
- **PicGo Image Host Integration**: Full PicGo-compatible image hosting support with multiple providers (SM.MS, GitHub, Gitee, Imgur, Qiniu, Aliyun OSS)
- **Auto-Update Support**: Integrated tauri-plugin-updater for automatic update checking and installation
- **Window State Persistence**: Added tauri-plugin-window-state to remember window size and position across sessions
- **Upload Notifications**: Added uploading notification with i18n support for upload status feedback
- **Image Host Settings Enhancement**: Full i18n support for image host settings with reset config feature

### Fixed
- **Aliyun OSS Signature**: Aligned Aliyun OSS area configuration with PicGo and fixed signature/URL generation bugs
- **Local Upload**: Fixed local image upload functionality
- **Config Compatibility**: Improved image host configuration compatibility with PicGo format

### Changed
- **Image Host UI Simplification**: Simplified image host settings UI for better user experience
- **Upload Behavior Alignment**: Aligned upload behavior with PicGo standards and improved path handling
- **HTTP Plugin Update**: Updated tauri-plugin-http dependencies with unsafe-headers and multipart features
- **Main.rs Refactoring**: Refactored invoke_handler in main.rs for better code organization
- **Image Host Type Sorting**: Reorganized pic-bed host type sorting in ImageHostSettings component

## [0.5.3] - 2026-05-20

### Added
- **Print Function**: Added print function to file menu with optimized styles for code blocks, tables, and dark mode
- **Language Persistence**: Language setting now persists to store.json across sessions

### Fixed
- **Markdown Export Path Conversion**: Fixed path conversion for markdown export to relative paths
- **Print Layout Issues**: Resolved print truncated content by resetting vditor-reset and container overflow
- **Print Window Title**: Use document title in print and hide browser header/footer
- **Maximized Window Print**: Fixed print layout issues when window is maximized
- **Drop Overlay Display**: Restored drop overlay functionality with enhanced visual effects following Vue3 best practices
- **Webview Print Permission**: Added webview print permission for Tauri v2

### Changed
- **Export Module Unification**: Unified print/pdf/html export into single export-lib module
- **Vditor CSS Loading**: Added dynamic Vditor CSS loading with light theme enforcement for exports
- **Print Styles Enhancement**: Improved print styles for better output quality

## [0.5.2] - 2026-05-18

### Added
- **Windows Portable Build**: Added Windows portable build support with dynamic path switching for store data
- **About Dialog Version Display**: Show software version in the About dialog
- **Zen Mode Shortcut Hint**: Added F11 shortcut hint in Zen mode menu with optimized tooltip styling
- **Discard Changes Option**: Added 'discard' option for unsaved changes prompt
- **Store Path Resolution**: Integrated backend store path resolution in frontend for portable mode support

### Changed
- **Counter Tooltip Direction**: Changed counter tooltip direction to west for better visibility
- **Build Optimization**: Eliminated dynamic import warnings and optimized build performance
- **Test Organization**: Moved test files to __tests__ directory for better project structure

### Removed
- **Drop Overlay**: Removed drop overlay for cleaner UI experience
- **Outdated Documents**: Removed outdated planning and code review documents

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

[Unreleased]: https://github.com/jeeinn/tauri-markdown/compare/v0.6.1...HEAD
[0.6.1]: https://github.com/jeeinn/tauri-markdown/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/jeeinn/tauri-markdown/compare/v0.5.3...v0.6.0
[0.5.3]: https://github.com/jeeinn/tauri-markdown/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/jeeinn/tauri-markdown/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/jeeinn/tauri-markdown/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/jeeinn/tauri-markdown/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/jeeinn/tauri-markdown/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/jeeinn/tauri-markdown/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/jeeinn/tauri-markdown/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/jeeinn/tauri-markdown/releases/tag/v0.3.0
