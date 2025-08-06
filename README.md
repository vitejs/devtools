![Vite DevTools](https://github.com/user-attachments/assets/ac930792-ba80-4eb3-9121-66fcd59dc2a8)

# Vite DevTools

Vite DevTools is a set of tools for visualizing the internal state and build analysis for Vite and Rolldown (currently only work with [`rolldown-vite`](https://github.com/vitejs/rolldown-vite)).

> [!IMPORTANT]
> This project is still in development. Not yet usable. You may preview it by building this project from source.

## 🏗️ Project Progress

State: **🚧 Work in progress**

We are currently focusing on get the basic data visualization working for **Vite-Rolldown's build mode**. Dev mode will be delayed for later until Vite get the full-bundler dev mode.

You can check the [TODO list](https://github.com/vitejs/devtools/issues/9) (excluding `hold-off`) if you are interested in helping out.

## 💡 Contributing Guide

We're really excited that you're interested in contributing to Vite DevTools! Before submitting your contribution, please take a moment to read through the following guidelines:

- For the `devtools-webext` package, we plan to use it for dev mode in the future, so no contributions are needed at this time.
- For any new feature additions, we recommend submitting an issue for discussion and confirmation first.

## 🧑‍💻 Development Guide

Currently Vite DevTools only supports build time inspection, to develop this project, you first need to build itself to get the Rolldown meta for testing.

- `pnpm install` to install dependencies
- `pnpm build` first to get the Rolldown logs under `./packages/devtools-vite/.rolldown` folder
- `pnpm dev` to start the dev server

As the data interface between Rolldown is not yet stable, and breaking changes are expected. We locked the Rolldown version in our `pnpm-workspace.yaml`, which means the published version may not work with the latest Rolldown.

When pulling the latest commits, it's recommended to remove the `./packages/devtools-vite/.rolldown` folder and run `pnpm build` again to get the latest data format.

## 📄 Licenses

This project is licensed under the [MIT License](LICENSE).
