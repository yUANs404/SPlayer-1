<template>
  <div class="update-playlist">
    <n-form ref="updateFormRef" :model="updateFormData" :rules="updateFormRules">
      <n-form-item label="歌单名" path="name">
        <n-input v-model:value="updateFormData.name" placeholder="请输入歌单名" />
      </n-form-item>
      <n-form-item label="歌单描述" path="desc">
        <n-input
          v-model:value="updateFormData.desc"
          :autosize="{
            minRows: 3,
            maxRows: 6,
          }"
          :maxlength="800"
          placeholder="请输入歌单描述"
          type="textarea"
          show-count
          clearable
        />
      </n-form-item>
    </n-form>
    <n-button class="create" type="primary" @click="toUpdatePlaylist"> 编辑 </n-button>
  </div>
</template>

<script setup lang="ts">
import type { CoverType } from "@/types/main";
import type { FormInst, FormRules } from "naive-ui";
import { textRule } from "@/utils/rules";
import { useLocalStore } from "@/stores";
import { debounce } from "lodash-es";

// 表单类型
interface UpdateFormType {
  name: string;
  desc?: string;
}

const props = defineProps<{
  id: number;
  data: CoverType;
  /** 是否为本地歌单 */
  isLocal?: boolean;
}>();

const emit = defineEmits<{ success: [] }>();

const localStore = useLocalStore();

// 表单数据
const updateFormRef = ref<FormInst | null>(null);
const updateFormData = ref<UpdateFormType>({
  name: props.data.name,
  desc: props.data.description,
});
const updateFormRules: FormRules = { name: textRule };

// 更新歌单
const toUpdatePlaylist = debounce(
  async (e: MouseEvent) => {
    e.preventDefault();
    // 是否输入
    await updateFormRef.value?.validate((errors) => errors);

    // 本地歌单
    const success = await localStore.updateLocalPlaylist(props.id, {
      name: updateFormData.value.name,
      description: updateFormData.value.desc,
    });
    if (success) {
      emit("success");
      window.$message.success("本地歌单编辑成功");
    } else {
      window.$message.error("本地歌单编辑失败");
    }
  },
  300,
  { leading: true, trailing: false },
);
</script>

<style lang="scss" scoped>
.update-playlist {
  .create {
    width: 100%;
  }
}
</style>
