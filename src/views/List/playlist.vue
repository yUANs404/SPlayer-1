<!-- 歌单列表（本地歌单） -->
<template>
  <div class="playlist-list">
    <ListDetail
      :detail-data="detailData?.id === playlistId ? detailData : null"
      :list-data="detailData?.id === playlistId ? listData : []"
      :loading="showLoading"
      :list-scrolling="listScrolling"
      :search-value="searchValue"
      :config="listConfig"
      :play-button-text="playButtonText"
      :more-options="moreOptions"
      @update:search-value="handleSearchUpdate"
      @play-all="playAllSongs"
    >
      <template #action-buttons>
        <n-button :focusable="false" strong secondary round @click="updatePlaylist">
          <template #icon>
            <SvgIcon name="EditNote" />
          </template>
          编辑歌单
        </n-button>
      </template>
    </ListDetail>
    <!-- 歌曲列表 -->
    <SongList
      v-if="!searchValue || searchData?.length"
      :data="detailData?.id === playlistId ? displayData : []"
      :loading="loading"
      :height="songListHeight"
      :playListId="playlistId"
      :draggable="canDragSort"
      :doubleClickAction="searchData?.length ? 'add' : 'all'"
      @scroll="handleListScroll"
      @removeSong="removeSong"
      @reorder="handleReorder"
    />
    <n-empty
      v-else
      :description="`搜不到关于 ${searchValue} 的任何歌曲呀`"
      style="margin-top: 60px"
      size="large"
    >
      <template #icon>
        <SvgIcon name="SearchOff" />
      </template>
    </n-empty>
  </div>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui";
import { useLocalStore, useStatusStore } from "@/stores";
import { renderIcon } from "@/utils/helper";
import { openBatchList, openUpdatePlaylist } from "@/utils/modal";
import { useListDetail } from "@/composables/List/useListDetail";
import { useListSearch } from "@/composables/List/useListSearch";
import { useListScroll } from "@/composables/List/useListScroll";
import { useListActions } from "@/composables/List/useListActions";

const router = useRouter();
const localStore = useLocalStore();
const statusStore = useStatusStore();

const {
  detailData,
  listData,
  loading,
  getSongListHeight,
  setDetailData,
  setListData,
  setLoading,
} = useListDetail();
const { searchValue, searchData, displayData, clearSearch, performSearch } =
  useListSearch(listData);
const { listScrolling, handleListScroll, resetScroll } = useListScroll();
const { playAllSongs: playAllSongsAction } = useListActions();

// 歌单 ID
const oldPlaylistId = ref<number>(0);
const playlistId = computed<number>(() => Number(router.currentRoute.value.query.id as string));

// 列表高度
const songListHeight = computed(() => getSongListHeight(listScrolling.value));

// 是否可拖拽排序（默认排序 + 非搜索模式）
const canDragSort = computed(() => {
  return !searchValue.value && statusStore.listSortField === "default";
});

// 列表配置
const listConfig = computed(() => ({
  titleType: "normal" as const,
  showCoverMask: true,
  showPlayCount: false,
  showArtist: false,
  showCreator: false,
  showCount: false,
  searchAlign: "center" as const,
}));

// 是否显示加载状态
const showLoading = computed(() => listData.value.length === 0 && loading.value);

// 播放按钮文本
const playButtonText = computed(() => {
  if (showLoading.value) return "加载中...";
  return "播放";
});

// 更多操作
const moreOptions = computed<DropdownOption[]>(() => [
  {
    label: "刷新歌单",
    key: "refresh",
    props: {
      onClick: () => getPlaylistDetail(playlistId.value),
    },
    icon: renderIcon("Refresh"),
  },
  {
    label: "批量操作",
    key: "batch",
    props: {
      onClick: () =>
        openBatchList(displayData.value, true, playlistId.value, () =>
          getPlaylistDetail(playlistId.value),
        ),
    },
    icon: renderIcon("Batch"),
  },
  {
    label: "删除歌单",
    key: "delete",
    props: {
      onClick: () => toDeletePlaylist(),
    },
    icon: renderIcon("Delete"),
  },
]);

// 获取本地歌单详情
const getPlaylistDetail = async (id: number) => {
  if (!id) return;
  // 设置加载状态
  setLoading(true);
  // 清空数据
  clearSearch();
  if (detailData.value?.id !== id) {
    setDetailData(null);
    setListData([]);
    resetScroll();
  }
  // 等待本地歌单加载
  if (id.toString().length === 16 && !localStore.isInitialized) {
    try {
      await localStore.readLocalPlaylists();
    } catch (e) {
      window.$message.error("获取本地歌单失败");
      console.error("Failed to init local playlists", e);
    }
  }
  // 本地歌单
  handleLocalPlaylist(id);
};

// 获取本地歌单
const handleLocalPlaylist = (id: number) => {
  const result = localStore.getLocalPlaylistDetail(id);
  if (!result) {
    window.$message.error("本地歌单不存在");
    setLoading(false);
    return;
  }
  const { playlist, songs } = result;
  // 获取封面：优先使用歌单封面，否则取第一首歌曲的封面
  let cover = playlist.cover;
  if (!cover && songs.length > 0) {
    cover = songs[0].cover;
  }
  // 转换为 CoverType 格式
  setDetailData({
    id: playlist.id,
    name: playlist.name,
    cover: cover || "/images/album.jpg?asset",
    description: playlist.description,
    count: playlist.songs.length,
    createTime: playlist.createTime,
    updateTime: playlist.updateTime,
  });
  setListData(songs);
  setLoading(false);
};

// 处理搜索更新
const handleSearchUpdate = (val: string) => {
  searchValue.value = val;
  performSearch(val);
};

// 播放全部歌曲
const playAllSongs = useDebounceFn(() => {
  if (!detailData.value || !displayData.value?.length) return;
  playAllSongsAction(displayData.value, playlistId.value);
}, 300);

// 删除歌单
const toDeletePlaylist = async () => {
  if (!detailData.value || !playlistId.value) return;
  window.$dialog.warning({
    title: "删除歌单",
    content: "确认删除这个歌单？该操作无法撤销！",
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      const success = await localStore.deleteLocalPlaylist(playlistId.value);
      if (success) {
        window.$message.success("本地歌单删除成功");
        router.back();
      } else {
        window.$message.error("删除失败");
      }
    },
  });
};

// 删除指定索引歌曲
const removeSong = async (ids: number[]) => {
  if (!listData.value) return;
  // 同步删除存储中的数据
  const songIds = ids.map((id) => id.toString());
  const success = await localStore.removeSongsFromLocalPlaylist(playlistId.value, songIds);
  if (!success) {
    window.$message.error("删除失败");
    return;
  }
  setListData(listData.value.filter((song) => !ids.includes(song.id)));
};

// 拖拽重排序
const handleReorder = async (fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex) return;

  // 乐观更新视图
  const newList = [...listData.value];
  const [moved] = newList.splice(fromIndex, 1);
  newList.splice(toIndex, 0, moved);
  setListData(newList);

  // 本地歌单持久化
  const success = await localStore.reorderSongsInLocalPlaylist(
    playlistId.value,
    fromIndex,
    toIndex,
  );
  if (!success) {
    window.$message.error("排序失败");
    handleLocalPlaylist(playlistId.value);
  }
};

// 编辑歌单
const updatePlaylist = () => {
  if (!detailData.value || !playlistId.value) return;
  openUpdatePlaylist(
    playlistId.value,
    detailData.value,
    () => getPlaylistDetail(playlistId.value),
    true,
  );
};

onBeforeRouteUpdate((to) => {
  const id = Number(to.query.id as string);
  if (id) {
    oldPlaylistId.value = id;
    getPlaylistDetail(id);
  }
});

onActivated(() => {
  // 是否为首次进入
  if (oldPlaylistId.value === 0) {
    oldPlaylistId.value = playlistId.value;
  } else {
    oldPlaylistId.value = playlistId.value;
    // 刷新歌单
    getPlaylistDetail(playlistId.value);
  }
});

onMounted(() => getPlaylistDetail(playlistId.value));
</script>
