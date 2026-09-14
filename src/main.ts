import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import { registerSW } from "virtual:pwa-register";
import App from "./App.vue";
import CoachPage from "./pages/CoachPage.vue";
import HomePage from "./pages/HomePage.vue";
import ModeLobbyPage from "./pages/ModeLobbyPage.vue";
import SessionPage from "./pages/SessionPage.vue";
import SummaryPage from "./pages/SummaryPage.vue";
import VoiceMockPage from "./pages/VoiceMockPage.vue";
import "./styles/main.css";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomePage },
    { path: "/mode/:mode", component: ModeLobbyPage },
    { path: "/session/:mode", component: SessionPage },
    { path: "/mock/:mode", component: VoiceMockPage },
    { path: "/summary/:sessionId", component: SummaryPage },
    { path: "/coach", component: CoachPage }
  ]
});

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log("New content available. Reload to update.");
  },
  onOfflineReady() {
    console.log("App ready to work offline.");
  }
});

window.__pwaUpdateSW = updateSW;

createApp(App).use(createPinia()).use(router).mount("#app");
