// 获取仓库更新日志
export const updateLog = async () => {
  const resp = await fetch("https://api.github.com/repos/SPlayer-Dev/SPlayer/releases");
  return resp.json();
};
