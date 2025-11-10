# KLYRA Assets

This folder contains all game and website assets.

## Folder Structure

### `/sprites/`
Character sprites and animations for website display:
- `malachar-idle.png` - Malachar idle animation sprite sheet
- `malachar-attack.png` - Malachar attack animation sprite sheet
- `aldric-idle.png` - Sir Aldric idle animation sprite sheet
- `aldric-attack.png` - Sir Aldric attack animation sprite sheet
- `hiroshi-idle.png` - Hiroshi idle animation sprite sheet
- `hiroshi-attack.png` - Hiroshi attack animation sprite sheet
- `skeleton-minion.png` - Skeleton minion sprite

### `/audio/`
Sound effects and music:
- `ui-hover.mp3` - UI hover sound effect
- `ui-click.mp3` - UI click sound effect
- `sword-slash.mp3` - Sword attack sound
- `shield-bash.mp3` - Shield impact sound
- `skeleton-summon.mp3` - Necromancy sound
- `theme-menu.mp3` - Menu background music (optional)
- `theme-character-select.mp3` - Character select music (optional)

### `/screenshots/`
Player screenshots and promotional images:
- Community submitted gameplay screenshots
- Promotional art and banners

### `/ui/`
UI elements and icons:
- Custom cursor sprites
- Button decorations
- Loading animations

## Asset Requirements

### Sprite Sheets
- Format: PNG with transparency
- Size: Multiples of base sprite size (e.g., 64x64 per frame)
- Layout: Horizontal strip or grid layout
- Naming: `charactername-animation.png`

### Audio Files
- Format: MP3 or OGG
- Quality: 128kbps minimum
- Length: UI sounds < 0.5s, music loopable

### Screenshots
- Format: PNG or JPG
- Size: 1920x1080 recommended
- Compression: Optimize for web

## Usage

These assets will be dynamically loaded by the website when available. The site has fallback UI for missing assets.
