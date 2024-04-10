# Laraguide

Using smoothly `Pint` and `Larastan` in docker context.

## Features

- Run Pint on save automatically
- Run larastan on save automatically
- Format document using Pint
- Format workspace using Pint
- Analyze document using Pint
- Analyze workspace using Pint

## Requirements

In `.vscode/settings.json`

```json
{
  "laraguide.enableLarastan": true,
  "laraguide.enablePint": true,
  "[php]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "henrotaym.laraguide"
  }
}
```

## Extension Settings

This extension contributes the following settings:

- `laraguide.enablePint`: Enable/disable Pint.
- `laraguide.pintExecutable`: Executable to run Pint
- `laraguide.enableLarastan`: Enable/disable Larastan.
- `laraguide.larastanExecutable`: Executable to run Larastan

## Known Issues

## Release Notes

### 0.0.1

Added pint and larastan
