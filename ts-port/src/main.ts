/**
 * Application entry point.
 *
 * Mounts the root Vue component (App.vue) into <div id="app"> from index.html.
 * App.vue owns the <canvas id="game"> and the game instance; this file only
 * bootstraps Vue — no game logic lives here.
 */
import { createApp } from 'vue';
import App from './ui/App.vue';

createApp(App).mount('#app');
