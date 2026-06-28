# Themes

Next Writer loads user themes from the config directory:

- Production macOS: `~/.config/nwriter/themes`
- Development macOS: `~/.config/nwriter-dev/themes`

Theme files must be JSON files named as `<themeId>.json`. The file name is the theme id.

Example `solarized-dark.json`:

```json
{
  "schemaVersion": 1,
  "name": "Solarized Dark",
  "mode": "dark",
  "tokens": {
    "nw-app-bg": "#002b36",
    "nw-panel-bg": "#073642",
    "nw-sidebar-bg": "#00212b",
    "nw-border-color": "rgba(238, 232, 213, 0.16)",
    "nw-text-primary": "#eee8d5",
    "nw-text-secondary": "#93a1a1",
    "nw-hover-bg": "rgba(238, 232, 213, 0.08)",
    "nw-selected-bg": "rgba(38, 139, 210, 0.22)",
    "nw-danger-color": "#dc322f",
    "nw-editor-bg": "#002b36",
    "nw-editor-text": "#eee8d5",
    "nw-editor-selection-bg": "rgba(38, 139, 210, 0.28)",
    "nw-theme-head-content": "#268bd2",
    "nw-theme-quote-content": "#93a1a1",
    "nw-theme-emphasis-content": "#b58900",
    "nw-theme-strong-content": "#dc322f",
    "nw-theme-list-content": "#eee8d5",
    "nw-theme-url-content": "#2aa198",
    "nw-theme-link-content": "#859900",
    "nw-theme-inline-code-content": "#2aa198",
    "nw-theme-head-mark": "#586e75",
    "nw-theme-quote-mark": "#268bd2",
    "nw-theme-list-mark": "#93a1a1",
    "nw-theme-link-mark": "#2aa198",
    "nw-theme-code-mark": "#93a1a1",
    "nw-theme-code-info": "#eee8d5",
    "ne-theme-table-delimiter": "#586e75"
  }
}
```

Unknown token keys are ignored. Unsafe CSS values and invalid JSON files are skipped by the main process.
