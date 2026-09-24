<!-- 主菜单 -->
<template>
  <n-menu
    ref="menuRef"
    v-model:value="menuActiveKey"
    v-model:expanded-keys="settingStore.menuExpandedKeys"
    :class="{ cover: settingStore.menuShowCover }"
    :indent="0"
    :root-indent="26"
    :collapsed="statusStore.menuCollapsed && isDesktop"
    :collapsed-width="64"
    :collapsed-icon-size="22"
    :options="menuOptions"
    :render-label="renderMenuLabel"
    @update:value="menuUpdate"
  />
</template>

<script setup lang="ts">
import { useMobile } from "@/composables/useMobile";
import { useLocalStore, useSettingStore, useStatusStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { renderIcon } from "@/utils/helper";
import { openCreatePlaylist } from "@/utils/modal";
import {
  type MenuGroupOption,
  type MenuInst,
  type MenuOption,
  NAvatar,
  NButton,
  NEllipsis,
  NText,
} from "naive-ui";
import { RouterLink, useRouter } from "vue-router";

const emit = defineEmits<{ (e: "menu-click", key: string): void }>();

const router = useRouter();
const localStore = useLocalStore();
const statusStore = useStatusStore();
const settingStore = useSettingStore();

const { isDesktop } = useMobile();

// 菜单数据
const menuRef = ref<MenuInst | null>(null);
const menuActiveKey = ref<string | number>((router.currentRoute.value.name as string) || "home");

// 菜单内容
const menuOptions = computed<MenuOption[] | MenuGroupOption[]>(() => {
  return [
    {
      key: "home",
      link: "home",
      label: "首页",
      icon: renderIcon("Home", {
        style: {
          transform: "translateY(-1px)",
        },
      }),
    },
    {
      key: "local",
      link: "local",
      label: "音乐库",
      show: isElectron && !settingStore.sidebarHide.hideLocal,
      icon: renderIcon("FolderMusic"),
    },
    {
      key: "local-albums",
      link: "local-albums",
      label: "专辑",
      show:
        isElectron &&
        (localStore.localSongs?.length > 0 || settingStore.localFilesPath?.length > 0),
      icon: renderIcon("Album"),
    },
    {
      key: "local-artists",
      link: "local-artists",
      label: "艺术家",
      show:
        isElectron &&
        (localStore.localSongs?.length > 0 || settingStore.localFilesPath?.length > 0),
      icon: renderIcon("Person"),
    },
    {
      key: "history",
      link: "history",
      label: "最近播放",
      show: !settingStore.sidebarHide.hideHistory,
      icon: renderIcon("History"),
    },
    {
      key: "divider",
      type: "divider",
      show: localPlaylistMenu.value.length > 0,
    },
    // 本地歌单
    {
      key: "local-playlists",
      show: localPlaylistMenu.value.length > 0,
      icon: statusStore.menuCollapsed ? renderIcon("PlaylistAdd") : undefined,
      label: () =>
        h("div", { class: "user-list" }, [
          h(NText, { depth: 3 }, () => "本地歌单"),
          h(NButton, {
            type: "tertiary",
            round: true,
            strong: true,
            secondary: true,
            renderIcon: renderIcon("Add"),
            onclick: (event: Event) => {
              event.stopPropagation();
              openCreatePlaylist(true);
            },
          }),
        ]),
      children: [...localPlaylistMenu.value],
    },
  ];
});

// 本地歌单菜单
const localPlaylistMenu = computed<MenuOption[]>(() => {
  const playlists = localStore.localPlaylists;
  if (!playlists || playlists.length === 0) return [];
  return playlists.map((playlist) => ({
    key: `local-${playlist.id}`,
    label: () =>
      settingStore.menuShowCover
        ? h("div", { class: "pl-cover" }, [
            h(NAvatar, {
              src: playlist.cover || "/images/album.jpg?asset",
              fallbackSrc: "/images/album.jpg?asset",
              lazy: true,
            }),
            h(NEllipsis, null, () => playlist.name),
          ])
        : h(NEllipsis, null, () => playlist.name),
    icon: settingStore.menuShowCover ? undefined : renderIcon("PlayList"),
  }));
});

// 渲染菜单路由
const renderMenuLabel = (option: MenuOption) => {
  // 路由链接
  if ("link" in option) {
    return h(RouterLink, { to: { name: option.link as string } }, () => option.label as string);
  }
  return typeof option.label === "function" ? option.label() : (option.label as string);
};

// 菜单项更改
const menuUpdate = (key: string, item: MenuOption) => {
  emit("menu-click", key);
  if (typeof key === "string" && key.startsWith("local-")) {
    // 检查是否为本地歌单（16位数字ID）
    const localId = key.replace("local-", "");
    const isLocalPlaylist = localStore.isLocalPlaylist(localId);
    if (isLocalPlaylist) {
      router.push({
        name: "playlist",
        query: { id: localId },
      });
    }
  }
};

// 选中菜单项
const checkMenuItem = () => {
  // 当前路由名称
  let routerName =
    (router.currentRoute.value.matched?.[0]?.name as string) ||
    (router.currentRoute.value?.name as string);
  if (!routerName) return;
  // 处理路由名称
  if (routerName.startsWith("local-")) {
    routerName = "local";
  }
  // 显示菜单
  menuRef.value?.showOption(routerName);
  // 高亮菜单
  switch (routerName) {
    case "playlist": {
      // 获取歌单 id
      const playlistId = Number(router.currentRoute.value.query.id || 0);
      // 是否为本地歌单
      const isLocalPlaylist = localStore.isLocalPlaylist(playlistId);
      if (!playlistId) menuActiveKey.value = "home";
      if (isLocalPlaylist) {
        menuActiveKey.value = `local-${playlistId}`;
        menuRef.value?.showOption(`local-${playlistId}`);
      } else {
        menuActiveKey.value = "home";
      }
      break;
    }
    default:
      menuActiveKey.value = routerName;
      break;
  }
};

// 自动展开本地歌单
onMounted(() => {
  if (localPlaylistMenu.value.length > 0) {
    if (!settingStore.menuExpandedKeys.includes("local-playlists")) {
      settingStore.menuExpandedKeys.push("local-playlists");
    }
  }
});

// 监听路由
watch(
  () => router.currentRoute.value,
  () => checkMenuItem(),
);
</script>

<style lang="scss" scoped>
.n-menu {
  padding-bottom: 14px;
  :deep(.n-menu-item) {
    .n-menu-item-content {
      &::before {
        border-left: 4px solid transparent;
        transition:
          border 0.3s var(--n-bezier),
          background-color 0.3s var(--n-bezier);
      }
      &.n-menu-item-content--selected {
        .n-text {
          color: var(--primary-hex);
        }
        &::before {
          border-left-color: var(--n-item-text-color-active);
        }
      }
    }
  }
  &.cover {
    :deep(.n-submenu-children) {
      --n-item-height: 50px;
    }
  }
}
</style>

<style lang="scss">
.user-list {
  display: flex;
  align-items: center;
  gap: 8px;
  .n-text {
    font-size: 0.93em;
  }
  .n-button {
    --n-height: 22px;
    --n-padding: 0 12px;
    --n-icon-size: 12px;
  }
}
.pl-cover {
  display: flex;
  align-items: center;
  .n-avatar {
    width: 34px;
    height: 34px;
    min-width: 34px;
    margin-right: 12px;
    border-radius: 8px;
  }
}
</style>
