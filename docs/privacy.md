---
outline: deep
---

# Vite DevTools Browser Extension Privacy Policy

Last updated: September 9, 2026

This policy covers the Vite DevTools browser extension. In this policy, “we” refers to the Vite DevTools maintainers.

## Information We Access

The extension checks each page after it loads and when you open the popup. It reads the page URL, module script URLs, and Vite DevTools connection information to update the icon and show whether DevTools is available.

When you open Chrome DevTools, the extension reads the page's connection object and uses the interface URL it contains to open the project's tools in the Vite tab. That object may also contain an authentication token. The extension receives the token as part of that object but does not save or forward it.

These checks run in your browser. The extension does not send detection results to us or record your browsing history.

## Project Connections

The Vite tab loads an interface from your project's development server. That server may be on your computer, on your local network, or hosted remotely. Using the interface sends requests to that server.

The interface and its integrations may store settings or credentials and connect to other services. Their data handling and retention depend on your project's configuration and those services' policies.

When you visit the documentation or interact with GitHub, the relevant website's privacy policy applies. Installation statistics collected by your browser vendor are covered by that vendor's privacy policy.

## Data Use

The extension uses page and connection information to detect and open Vite DevTools. We do not sell this information or use it for advertising, credit assessments, or lending.

Our use of this information complies with the Chrome Web Store User Data Policy, including its Limited Use requirements.

## Data Storage and Your Choices

The extension keeps detection results and connection information in memory during use. Settings and other data saved by the project's interface are managed through that project or service.

You can change site access, disable the extension, or uninstall it in Chrome's extension settings. Limiting site access may prevent detection.

## Contact

If you have questions about this policy, contact us through the [Vite DevTools issue tracker](https://github.com/vitejs/devtools/issues). Issues are public; keep credentials and private project data out of them.

If our practices change, we will revise this policy and update the date above.
