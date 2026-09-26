# Network Access — United Robotics local plugin

Independent plugin using the same `mount` / `invoke` / one-shot `rpc.mjs` architecture as Todo List. React and Radix Themes, CSS and standalone Node backend are bundled into committed artifacts. No Worker, hosted backend, extra login or extra local daemon.

## Build and publish

`npm ci && npm run check`, commit reproducible `dist/` files and publish canonical main. Capital pins `https://cdn.jsdelivr.net/gh/exisz/united-robotics-plugin-access-control@<full SHA>/dist/manifest.json` with `props.window: "access"`.

## Instance Secret Manager integration

Requires a World runtime supporting `connectors.json.localPlugins`. Declare `localPlugins["access-control"].requiredSecrets` as `[{"key":"CLOUDFLARE_ACCESS_TOKEN","label":"Cloudflare Access"}]`, then set an account-scoped Access Apps and Policies token in Settings → Connector secrets. The existing connector injects that key into the one-shot backend environment. Missing credentials fail closed. No extra secret mount, service or permission model is needed.

Never put credentials in this repository, browser props, plugin-data or public artifacts. The backend never reads the instance secret file; public account/application/policy identifiers are fixed configuration. Trusted local plugins are not an adversarial isolation boundary.

The backend only targets Capital Access application `3534f755-aa33-4a89-b46e-3188465c177d`, policy `86e572c9-33e5-4ef4-8772-b50743ba0c83`. It preserves non-geographic conditions. Country/IP selectors are OR. Revision checks are optimistic pre-read checks, not atomic Cloudflare CAS. Initial reads do not fake CN/AU defaults.

## Verification boundary

Tests cover compiled component rendering in jsdom, current AU/CN from injected response, visible errors, retaining edits after failed saves, one-shot failures, fixed upstream target, preserving login conditions, invalid inputs and stale revision refusal. Production verification must additionally exercise authenticated local read-save-readback with the configured instance credential. CDN reachability alone is not a production test.
