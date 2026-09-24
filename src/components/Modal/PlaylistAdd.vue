<!-- 添加到歌单（本地歌单） -->
<template>
  <div class="playlist-add">
    <n-scrollbar style="max-height: 70vh">
      <n-list class="playlists-list" hoverable clickable>
        <!-- 新建本地歌单 -->
        <n-list-item class="playlist add" @click="openCreatePlaylist(true)">
          <template #prefix>
            <SvgIcon name="Add" :size="20" />
          </template>
          <n-thing title="创建新歌单" />
        </n-list-item>
        <!-- 本地歌单列表 -->
        <template v-if="localPlaylists.length > 0">
          <n-list-item
            v-for="item in localPlaylists"
            :key="item.id"
            class="playlist"
            @click="addToLocalPlaylist(item.id)"
          >
            <template #prefix>
              <n-image
                :src="item.cover || '/images/album.jpg?asset'"
                class="cover"
                preview-disabled
                lazy
                @load="coverLoaded"
              >
                <template #placeholder>
                  <div class="cover-loading">
                    <img class="loading-img" src="/images/album.jpg?asset" alt="loading-img" />
                  </div>
                </template>
              </n-image>
            </template>
            <n-thing :title="item.name">
              <template #description>
                <n-text depth="3" class="size">{{ item.songs.length }} 首音乐</n-text>
              </template>
            </n-thing>
          </n-list-item>
        </template>
        <n-empty v-else description="暂无本地歌单" style="padding: 40px 0" />
      </n-list>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { MessageReactive } from "naive-ui";
import { useLocalStore } from "@/stores";
import { coverLoaded } from "@/utils/helper";
import { debounce } from "lodash-es";
import { openCreatePlaylist } from "@/utils/modal";

const props = defineProps<{
  data: SongType[];
  isLocal: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const localStore = useLocalStore();

// 加载提示
const loadingMsg = ref<MessageReactive>();

// 本地歌单
const localPlaylists = computed(() => localStore.localPlaylists);

// 添加到本地歌单
const addToLocalPlaylist = debounce(
  async (playlistId: number) => {
    loadingMsg.value = window.$message.loading("正在添加歌曲至本地歌单", { duration: 0 });
    try {
      // 本地歌曲使用 id 的字符串形式
      const songIds = props.data.map((item) => item.id.toString());
      const result = await localStore.addSongsToLocalPlaylist(playlistId, songIds);
      if (loadingMsg.value) loadingMsg.value.destroy();
      if (result.success) {
        emit("close");
        if (result.addedCount > 0) {
          window.$message.success(`成功添加 ${result.addedCount} 首歌曲至本地歌单`);
        } else {
          window.$message.info("所选歌曲已在歌单中");
        }
      } else {
        window.$message.error("添加失败，歌单不存在");
      }
    } catch (error) {
      if (loadingMsg.value) loadingMsg.value.destroy();
      window.$message.error("添加失败，请重试");
    }
  },
  500,
  { leading: true, trailing: false },
);
</script>

<style lang="scss" scoped>
.playlists-list {
  .playlist {
    border-radius: 8px;
    :deep(.n-list-item__prefix) {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 50px;
      height: 50px;
      border-radius: 8px;
      background-color: var(--n-border-color);
      overflow: hidden;
      transition: background-color 0.3s;
    }
  }
}
.n-empty {
  padding: 40px 0;
}
</style>
