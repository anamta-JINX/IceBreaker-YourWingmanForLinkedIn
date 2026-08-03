# Chrome distribution

## Chrome Web Store

Use the Web Store ZIP generated from the runtime files. The archive must contain `manifest.json` at its root. Upload it through the Chrome Web Store Developer Dashboard.

## CRX

A CRX is Chrome's packed extension format. It is a single file but is not a way to hide source code. Modern Chrome normally expects extensions for regular users to be installed through the Chrome Web Store.

## Credentials

Never include real API keys in a public ZIP or CRX. A public build should use user-provided keys or a backend proxy.
