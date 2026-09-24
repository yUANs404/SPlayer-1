<template>
  <div class="create-playlist">
    <!-- 本地歌单表单 -->
    <n-form ref="localFormRef" :model="localFormData" :rules="localFormRules">
      <n-form-item label="歌单名称" path="name">
        <n-input v-model:value="localFormData.name" placeholder="请输入歌单名称" />
      </n-form-item>
      <n-form-item label="歌单描述" path="description">
        <n-input
          v-model:value="localFormData.description"
          type="textarea"
          placeholder="请输入歌单描述（选填）"
          :autosize="{ minRows: 2, maxRows: 4 }"
        />
      </n-form-item>
    </n-form>
    <n-button class="create" type="primary" @click="toCreatePlaylist"> 新建 </n-button>
  </div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules } from "naive-ui";
import { useLocalStore } from "@/stores";
import { textRule } from "@/utils/rules";
import { debounce } from "lodash-es";

withDefaults(
  defineProps<{
    /** 是否为本地歌单模式 */
    isLocal?: boolean;
  }>(),
  { isLocal: false },
);

const emit = defineEmits<{ close: [] }>();

interface LocalFormType {
  name: string;
  description?: string;
}

const localStore = useLocalStore();

// 本地歌单数据
const localFormRef = ref<FormInst | null>(null);
const localFormData = ref<LocalFormType>({ name: "", description: "" });
const localFormRules: FormRules = { name: textRule };

// 新建歌单
const toCreatePlaylist = debounce(
  async (e: MouseEvent) => {
    e.preventDefault();
    // 本地歌单
    try {
      await localFormRef.value?.validate();
      await localStore.createLocalPlaylist(
        localFormData.value.name,
        localFormData.value.description,
      );
      emit("close");
      window.$message.success("新建本地歌单成功");
    } catch (error) {
      if (error) {
        // 验证失败，不做处理
        return;
      }
      window.$message.error("新建本地歌单失败，请重试");
    }
  },
  300,
  { leading: true, trailing: false },
);
</script>

<style lang="scss" scoped>
.create-playlist {
  .n-form {
    margin-top: 12px;
  }
  .create {
    width: 100%;
  }
  .n-empty {
    padding: 40px 0;
  }
}
</style>
