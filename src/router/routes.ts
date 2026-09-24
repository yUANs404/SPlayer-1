import AppLayout from "@/layout/AppLayout.vue";
import { type RouteRecordRaw } from "vue-router";

/**
 * 应用路由
 * @returns {Array<RouteRecordRaw>} 应用路由
 */
const appRoutes: Array<RouteRecordRaw> = [
  // 首页
  {
    path: "/",
    name: "home",
    component: () => import("@/views/Home/index.vue"),
  },
  // 歌单（本地歌单详情）
  {
    path: "/playlist",
    name: "playlist",
    beforeEnter: (to, _, next) => {
      if (!to.query.id) next({ path: "/403" });
      else next();
    },
    component: () => import("@/views/List/playlist.vue"),
  },
  // 本地歌曲
  {
    path: "/local",
    name: "local",
    meta: { needApp: true },
    component: () => import("@/views/Local/layout.vue"),
    redirect: "/local/songs",
    children: [
      {
        path: "songs",
        name: "local-songs",
        component: () => import("@/views/Local/song.vue"),
      },
      {
        path: "artists",
        name: "local-artists",
        component: () => import("@/views/Local/artists.vue"),
      },
      {
        path: "albums",
        name: "local-albums",
        component: () => import("@/views/Local/albums.vue"),
      },
      {
        path: "folders",
        name: "local-folders",
        component: () => import("@/views/Local/folders.vue"),
      },
      {
        path: "playlists",
        name: "local-playlists",
        component: () => import("@/views/Local/playlists.vue"),
      },
    ],
  },
  // 最近播放
  {
    path: "/history",
    name: "history",
    component: () => import("@/views/History.vue"),
  },
  // 状态
  {
    path: "/403",
    name: "403",
    component: () => import("@/views/Status/403.vue"),
  },
  {
    path: "/404",
    name: "404",
    component: () => import("@/views/Status/404.vue"),
  },
  {
    path: "/500",
    name: "500",
    component: () => import("@/views/Status/500.vue"),
  },
];

/**
 * 路由配置
 * @returns {Array<RouteRecordRaw>} 路由配置
 */
const routes: Array<RouteRecordRaw> = [
  // 应用路由
  {
    path: "/",
    component: AppLayout,
    children: [...appRoutes],
  },
  // 桌面歌词
  {
    path: "/desktop-lyric",
    name: "desktop-lyric",
    meta: { needApp: true },
    component: () => import("@/views/DesktopLyric/index.vue"),
  },
  // 404
  {
    path: "/:pathMatch(.*)*",
    redirect: "/404",
  },
];

export default routes;
