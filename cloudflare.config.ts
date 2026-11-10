import { bindings, defineConfig, exports, triggers } from "cf/config"

// Public multi-tenant Slack app at anoma.ly/labs/bank. One Workspace Durable Object per Slack team.
// Secrets live only on the Worker: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET, SESSION_SECRET.
export default defineConfig(() => ({
  accountId: "15d29c8639fd3733b1b5486a2acfd968",
  worker: {
    name: "bank",
    compatibilityDate: "2026-09-08",
    entrypoint: "./src/server/worker.ts",
    assets: { runWorkerFirst: true },
    env: {
      ASSETS: bindings.assets(),
      WORKSPACES: bindings.durableObject({ worker: "bank", exportName: "Workspace" }),
      PUBLIC_URL: bindings.text("https://anoma.ly/labs/bank"),
      SLACK_CLIENT_ID: bindings.secret(),
      SLACK_CLIENT_SECRET: bindings.secret(),
      SLACK_SIGNING_SECRET: bindings.secret(),
      SESSION_SECRET: bindings.secret(),
    },
    exports: {
      Workspace: exports.durableObject({ storage: "sqlite" }),
    },
    triggers: [
      triggers.fetch({ pattern: "anoma.ly/labs/bank", zone: "anoma.ly" }),
      triggers.fetch({ pattern: "anoma.ly/labs/bank/*", zone: "anoma.ly" }),
    ],
    observability: { enabled: true },
    workersDev: false,
    previewUrls: false,
  },
}))
