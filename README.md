# AoE2 Civilization Quiz (Web Version)

A quiz game to test your Age of Empires 2 civilization knowledge.

## Features

- 17 language support
- Dark/Light theme toggle
- Question type filtering (bonuses, unique units, unique techs, team bonuses)
- Autocomplete for civilization names
- Persistent settings in localStorage

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Deployment

The built files will be in the `dist` folder. You can deploy this to:
- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

### Netlify

1. Run `bun run build`
2. Drag the `dist` folder to [app.netlify.com/drop](https://app.netlify.com/drop)

Or use Git:
1. Push to GitHub
2. Import in Netlify with build command: `bun install && bun run build`
3. Publish directory: `dist`
