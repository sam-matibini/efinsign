import { defineConfig } from "vitepress";

export default defineConfig({
  title: "eFinSign API",
  description: "Programmatic e-signature workflows for your applications.",
  lang: "en-US",
  base: "/developers/",
  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
  ],

  themeConfig: {
    logo: "/logo.svg",
    search: { provider: "local" },

    nav: [
      { text: "Home", link: "/" },
      { text: "Quickstart", link: "/quickstart" },
      { text: "API Reference", link: "/api-reference" },
      { text: "eFinSign", link: "https://efinsign.ca" },
    ],

    sidebar: {
      "/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/" },
            { text: "Quickstart", link: "/quickstart" },
            { text: "Authentication", link: "/authentication" },
          ],
        },
        {
          text: "Concepts",
          items: [
            { text: "Documents", link: "/concepts/documents" },
            { text: "Signers & Fields", link: "/concepts/signers" },
            { text: "Templates", link: "/concepts/templates" },
            { text: "Webhooks", link: "/concepts/webhooks" },
          ],
        },
        {
          text: "Guides",
          items: [
            { text: "Embedding Signing", link: "/embedding" },
            { text: "Setting Up Webhooks", link: "/webhooks" },
            { text: "SDK Overview", link: "/sdk" },
          ],
        },
        {
          text: "Reference",
          items: [
            { text: "API Reference", link: "/api-reference" },
            { text: "Changelog", link: "/changelog" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com" },
    ],

    footer: {
      message: "Built for developers. Powered by eFinSign.",
      copyright: "Copyright © 2026 eFinSign",
    },
  },

  markdown: {
    theme: { light: "github-light", dark: "github-dark" },
  },
});
