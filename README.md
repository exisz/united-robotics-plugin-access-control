# Network Access — United Robotics local plugin

Independent plugin using the same `mount` / `invoke` / one-shot `rpc.mjs` architecture as Todo List. React and Radix Themes, CSS and standalone Node backend are bundled into committed artifacts. No Worker, hosted backend, extra login or extra local daemon.

## Build and publish

`npm ci && npm run check`, commit reproducible `dist/` files and publish canonical main. Capital pins `https://cdn.jsdelivr.net/gh/exisz/united-robotics-plugin-access-control@<full SHA>/dist/manifest.json` with `props.window: "access"`.

## Explicit credential deployment prerequisite

The current deployed V1 plugin runner does not inject secrets. This backend fails closed until an approved deployment binds a **dedicated** read-only file at `/run/secrets/capital-access-control.json`, containing `accountId` and a scoped Cloudflare Access token as `token`. Never put it in this repository, browser props, plugin-data, or the public artifact. The child UID must be able to read only this scoped credential, not the whole instance store. Other trusted V1 plugins share that UID; this is not adversarial plugin isolation.

The proposed mount is pending owner approval; it is not an existing generic V1 credential API. The alternative is an approved generic runtime secret capability, which requires World work. Do not silently patch runtime files.

The backend only targets Capital Access application `3534f755-aa33-4a89-b46e-3188465c177d`, policy `86e572c9-33e5-4ef4-8772-b50743ba0c83`. It preserves non-geographic conditions. Country/IP selectors are OR. Revision checks are optimistic pre-read checks, not atomic Cloudflare CAS. Initial reads do not fake CN/AU defaults.

## Verification boundary

Tests cover real compiled component rendering in jsdom, current AU/CN from injected response, visible errors, retaining edits after failed saves, one-shot failures, fixed upstream target, preserving login conditions, invalid inputs and stale revision refusal. Production installation/read-save-readback still requires the approved secret binding. Do not label a CDN-ready build as a working production installation.
