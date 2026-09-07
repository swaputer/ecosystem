# Swaputer Glass design system

The active visual direction keeps the existing desktop and mobile information architecture, while replacing the earlier pixel treatment with a dark Liquid Glass-inspired material system.

## Reference images

- `design/tahoe-desktop-home.png` — desktop shell and Dock
- `design/tahoe-desktop-bridge.png` — application window and transaction form
- `design/tahoe-mobile-home.png` — mobile home screen without a Dock or wallet balance
- `design/tahoe-standby-desktop.png` — restrained desktop wallet connection screen
- `design/tahoe-standby-mobile.png` — restrained mobile wallet connection screen
- `design/tahoe-standby-desktop-implemented.png` — verified desktop standby implementation
- `design/tahoe-standby-mobile-implemented.png` — verified mobile standby implementation
- `design/tahoe-terminal-desktop.png` — desktop Terminal window
- `design/tahoe-terminal-mobile.png` — full-screen mobile Terminal
- `design/tahoe-terminal-desktop-implemented.png` — verified desktop implementation
- `design/tahoe-terminal-mobile-implemented.png` — verified mobile implementation

## Product palette

The palette follows the protocol explorer rather than a generic operating-system theme:

- canvas `#131313`
- surface `#1b1b1b`
- raised surface `#202020`
- primary text `#f5f5f6`
- muted text `#a4a4a8`
- accent `#ff37c7`
- accent hover `#ff5bd0`

Green is reserved for positive status only. It is never the product accent.

The canonical brand mark is the exact `swaputer-mark.png` used by `explorer/apps/swaputer-web` (SHA-256 `42fdf9ade405981be38d74a2daee18f47c59603e4e28ae57619f35e00bd164ad`). Generated concept marks are composition references only and must never replace it.

## Material rules

- Menu bar, Dock, window chrome, wallet popover, application library, and confirmation dialogs use translucent dark glass with a restrained blur and a bright top-edge highlight.
- Application content uses opaque or near-opaque graphite surfaces for contrast and transaction safety.
- Corners are continuous and rounded; shadows are soft and layered rather than offset pixel blocks.
- App icons are smooth SVG glyphs inside glass squircle tiles. The system does not use rasterized or crisp-edge pixel icons. The Applications view searches by app name and shows only each app's icon and name.
- Every app uses a consistent 32×32 semantic glyph, a restrained app-specific tint, and the same squircle material. Only the Swaputer system icon uses the canonical raster brand mark.
- Inter Variable is the sole interface typeface.

## Responsive contract

Desktop and mobile preserve the same applications and flows. Mobile renders each function as a full-screen app, hides the desktop ETH balance, and does not render the Dock. Desktop retains the top-right ETH balance, independent movable windows, and Dock.

Terminal is a read-only command surface backed by `@swaputer-labs/cli/browser`. It uses the configured Base Sepolia RPC endpoint, never accesses the wallet signer, and exposes only transaction inspection, receipt decoding, help, version and local screen clearing.
