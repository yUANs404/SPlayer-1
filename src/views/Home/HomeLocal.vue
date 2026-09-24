<template>
  <div class="home-local">
    <!-- 快捷入口 -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16" item-responsive responsive="screen">
      <n-grid-item span="4 s:2 m:1">
        <div class="entry-card" @click="router.push({ name: 'local-songs' })">
          <SvgIcon name="FolderMusic" :size="30" />
          <div class="entry-data">
            <n-text class="entry-title">音乐库</n-text>
            <n-text depth="3" class="entry-desc">{{ localSongCount }} 首歌曲</n-text>
          </div>
        </div>
      </n-grid-item>
      <n-grid-item span="4 s:2 m:1">
        <div class="entry-card" @click="router.push({ name: 'local-albums' })">
          <SvgIcon name="Album" :size="30" />
          <div class="entry-data">
            <n-text class="entry-title">专辑</n-text>
            <n-text depth="3" class="entry-desc">{{ localAlbumCount }} 张专辑</n-text>
          </div>
        </div>
      </n-grid-item>
      <n-grid-item span="4 s:2 m:1">
        <div class="entry-card" @click="router.push({ name: 'local-artists' })">
          <SvgIcon name="Person" :size="30" />
          <div class="entry-data">
            <n-text class="entry-title">艺术家</n-text>
            <n-text depth="3" class="entry-desc">{{ localArtistCount }} 位艺术家</n-text>
          </div>
        </div>
      </n-grid-item>
      <n-grid-item span="4 s:2 m:1">
        <div class="entry-card" @click="router.push({ name: 'history' })">
          <SvgIcon name="History" :size="30" />
          <div class="entry-data">
            <n-text class="entry-title">最近播放</n-text>
            <n-text depth="3" class="entry-desc">{{ historyCount }} 条记录</n-text>
          </div>
        </div>
      </n-grid-item>
    </n-grid>
    <!-- 本地歌单 -->
    <div v-if="localPlaylists.length > 0" class="playlist-section">
      <n-flex align="center" justify="space-between" class="section-header">
        <n-h2 class="section-title">本地歌单</n-h2>
        <n-button
          :focusable="false"
          strong
          secondary
          round
          @click="router.push({ name: 'local-playlists' })"
        >
          查看全部
        </n-button>
      </n-flex>
      <CoverList
        :data="localPlaylists"
        type="playlist"
        :hidden-cover="settingStore.hideAllCovers"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDataStore, useLocalStore, useSettingStore } from "@/stores";
import CoverList from "@/components/List/CoverList.vue";

const router = useRouter();
const dataStore = useDataStore();
const localStore = useLocalStore();
const settingStore = useSettingStore();

// 本地数据统计
const localSongCount = computed(() => localStore.localSongs?.length || 0);
const localAlbumCount = computed(
  () =>
    new Set(
      localStore.localSongs?.map((song) =>
        typeof song.album === "object" ? song.album?.name : song.album,
      ) || [],
    ).size,
);
const localArtistCount = computed(() => {
  const artists = new Set<string>();
  localStore.localSongs?.forEach((song) => {
    if (Array.isArray(song.artists)) {
      song.artists.forEach((ar) => {
        if (typeof ar === "object" && ar?.name) artists.add(ar.name);
      });
    } else if (song.artists) {
      artists.add(song.artists);
    }
  });
  return artists.size;
});
const historyCount = computed(() => dataStore.historyList?.length || 0);

// 本地歌单
const localPlaylists = computed(() => {
  return (localStore.localPlaylists || []).map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    cover: playlist.cover || "/images/album.jpg?asset",
    description: playlist.description,
    count: playlist.songs.length,
    createTime: playlist.createTime,
    updateTime: playlist.updateTime,
  }));
});
</script>

<style lang="scss" scoped>
.home-local {
  width: 100%;
  .entry-card {
    display: flex;
    align-items: center;
    gap: 14px;
    height: 90px;
    padding: 0 20px;
    border-radius: 16px;
    border: 2px solid rgba(var(--primary), 0.12);
    background-color: var(--surface-container-hex);
    cursor: pointer;
    transition:
      border-color 0.3s,
      transform 0.3s;
    .n-icon {
      color: var(--primary-hex);
      transition: transform 0.3s;
    }
    .entry-data {
      display: flex;
      flex-direction: column;
      .entry-title {
        font-size: 18px;
        font-weight: bold;
      }
      .entry-desc {
        font-size: 13px;
      }
    }
    &:hover {
      border-color: rgba(var(--primary), 0.58);
      transform: translateY(-2px);
      .n-icon {
        transform: scale(1.1);
      }
    }
  }
  .playlist-section {
    margin-top: 30px;
    .section-header {
      margin-bottom: 4px;
      .section-title {
        margin: 0;
        font-weight: bold;
      }
    }
  }
}
</style>
