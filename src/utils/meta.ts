import type { ImageRenderToolbarProps } from "naive-ui";

/** Fuck DJ Mode 关键词 */
export const DJ_MODE_KEYWORDS = ["DJ", "抖音", "0.9", "0.8", "网红", "车载", "热歌", "慢摇"];

/** 歌曲脏标（Explicit Content）位掩码 */
export const EXPLICIT_CONTENT_MARK = 1048576;

/**
 * 排序字段选项
 */
export const sortFieldOptions = {
  default: { name: "默认" },
  title: { name: "标题" },
  artist: { name: "歌手" },
  album: { name: "专辑" },
  trackNumber: { name: "曲目序号" },
  filename: { name: "文件名" },
  duration: { name: "时长" },
  size: { name: "大小" },
  createTime: { name: "添加时间" },
  updateTime: { name: "更改时间" },
} as const;

/**
 * 排序方式选项
 */
export const sortOrderOptions = {
  default: { name: "默认" },
  asc: { name: "升序" },
  desc: { name: "降序" },
} as const;

/**
 * 渲染图片工具栏
 * @param nodes 图片工具栏节点
 * @returns 图片工具栏
 */
export const renderToolbar = ({ nodes }: ImageRenderToolbarProps) => {
  return [
    nodes.prev,
    nodes.next,
    nodes.rotateCounterclockwise,
    nodes.rotateClockwise,
    nodes.resizeToOriginalSize,
    nodes.zoomOut,
    nodes.zoomIn,
    nodes.download,
    nodes.close,
  ];
};
