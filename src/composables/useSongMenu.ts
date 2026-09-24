import { DropdownOption } from "naive-ui";
import { SongType } from "@/types/main";
import {
  useStatusStore,
  useDataStore,
  useMusicStore,
  useSettingStore,
  useLocalStore,
} from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { renderIcon, copyData } from "@/utils/helper";
import { openPlaylistAdd, openSongInfoEditor } from "@/utils/modal";

/** 歌曲菜单 */
export const useSongMenu = () => {
  const dataStore = useDataStore();
  const musicStore = useMusicStore();
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  const player = usePlayerController();
  const localStore = useLocalStore();

  // 删除本地歌曲
  const deleteLocalSong = (song: SongType, emit?: (event: "removeSong", args: any[]) => void) => {
    if (emit === undefined) return;
    if (!song.path) return;
    window.$dialog.warning({
      title: "确认删除",
      content: () =>
        h("div", { style: { marginTop: "20px" } }, [
          h("div", { style: { marginBottom: "10px", opacity: 0.8, fontSize: "12px" } }, song.path),
          h("div", null, [
            `确认从本地磁盘中删除 `,
            h("strong", null, song.name),
            `？该操作无法撤销！`,
          ]),
        ]),
      positiveText: "删除",
      negativeText: "取消",
      onPositiveClick: async () => {
        const result = await window.electron.ipcRenderer.invoke("delete-file", song.path);
        if (result) {
          emit("removeSong", [song.id]);
          const currentPlayList = dataStore.playList;
          const songToRemoveIndex = currentPlayList.findIndex(
            (playSong) => playSong.id === song.id,
          );
          if (songToRemoveIndex !== -1) {
            player.removeSongIndex(songToRemoveIndex);
          }
          window.$message.success(`${song.name} 删除成功`);
        } else {
          window.$message.error(`${song.name} 删除失败，请重试`);
        }
      },
    });
  };

  // 判断两首歌是否相同
  const isSameSong = (song1: SongType, song2: SongType): boolean => {
    if (song1.id != null && song2.id != null) {
      return song1.id === song2.id;
    }
    if (song1.path && song2.path) {
      return song1.path === song2.path;
    }
    return false;
  };

  // 生成菜单选项
  const getMenuOptions = (
    song: SongType,
    index: number = -1,
    playListId: number = 0,
    _isDailyRecommend: boolean = false,
    emit?: (event: "removeSong", args: any[]) => void,
  ): DropdownOption[] => {
    const type = song.type || "song";
    const isLocal = !!song?.path;
    const isCurrent = isSameSong(musicStore.playSong, song);
    const isLocalPlaylist = localStore.isLocalPlaylist(playListId);

    return [
      {
        key: "play",
        label: "立即播放",
        show: settingStore.contextMenuOptions.play,
        props: {
          onClick: () => player.addNextSong(song, true),
        },
        icon: renderIcon("Play", { size: 18 }),
      },
      {
        key: "play-next",
        label: "下一首播放",
        show: settingStore.contextMenuOptions.playNext && !isCurrent,
        props: {
          onClick: () => player.addNextSong(song, false),
        },
        icon: renderIcon("PlayNext", { size: 18 }),
      },
      {
        key: "playlist-add",
        label: "添加到歌单",
        show: settingStore.contextMenuOptions.addToPlaylist,
        props: {
          onClick: () => openPlaylistAdd([song], true),
        },
        icon: renderIcon("AddList", { size: 18 }),
      },
      {
        key: "line-1",
        type: "divider",
        show:
          settingStore.contextMenuOptions.play ||
          settingStore.contextMenuOptions.playNext ||
          settingStore.contextMenuOptions.addToPlaylist,
      },
      {
        key: "more",
        label: "更多操作",
        show: settingStore.contextMenuOptions.more,
        icon: renderIcon("Menu", { size: 18 }),
        children: [
          {
            key: "code-name",
            label: `复制${type === "song" ? "歌曲" : "节目"}名称`,
            show: settingStore.contextMenuOptions.copyName,
            props: {
              onClick: () => copyData(song.name),
            },
            icon: renderIcon("Copy", { size: 18 }),
          },
          {
            key: "line-2",
            type: "divider",
            show: settingStore.contextMenuOptions.musicTagEditor && isLocal,
          },
          {
            key: "meta-edit",
            label: "音乐标签编辑",
            show: settingStore.contextMenuOptions.musicTagEditor && isLocal,
            props: {
              onClick: () => {
                if (song.path) openSongInfoEditor(song);
              },
            },
            icon: renderIcon("EditNote", { size: 20 }),
          },
        ],
      },
      {
        key: "line-two",
        type: "divider",
        show: settingStore.contextMenuOptions.more,
      },
      {
        key: "delete-playlist",
        label: "从歌单中删除",
        show:
          settingStore.contextMenuOptions.deleteFromPlaylist &&
          emit !== undefined &&
          isLocalPlaylist,
        props: {
          onClick: () => {
            window.$dialog.warning({
              title: "确认删除",
              content: `确认将 ${song.name} 从歌单中删除？`,
              positiveText: "删除",
              negativeText: "取消",
              onPositiveClick: async () => {
                await localStore.removeSongsFromLocalPlaylist(playListId, [song.id]);
                emit?.("removeSong", [song.id]);
                window.$message.success("删除成功");
              },
            });
          },
        },
        icon: renderIcon("Delete"),
      },
      {
        key: "delete-local",
        label: "从本地磁盘中删除",
        show:
          settingStore.contextMenuOptions.deleteFromLocal &&
          emit !== undefined &&
          isLocal &&
          !isCurrent,
        props: {
          onClick: () => deleteLocalSong(song, emit),
        },
        icon: renderIcon("Delete"),
      },
      {
        key: "open-folder",
        label: "打开歌曲所在目录",
        show: settingStore.contextMenuOptions.openFolder && isLocal,
        props: {
          onClick: () => window.electron.ipcRenderer.send("open-folder", song.path),
        },
        icon: renderIcon("SnippetFolder"),
      },
    ];
  };

  return { getMenuOptions };
};
