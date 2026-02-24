const apps = [];

export function initializeApp(config) {
  const app = { config, name: "[DEFAULT]" };
  apps.push(app);
  return app;
}

export function getApps() {
  return apps;
}

export function getApp() {
  if (!apps.length) {
    throw new Error("No Firebase app initialized");
  }
  return apps[0];
}
