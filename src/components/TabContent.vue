<template>
  <div v-show="isActive" class="tab-content">
    <MyVditor
      ref="vditorRef"
      :key="tab.id"
      :tab-id="tab.id"
      :initial-file="tab.filePath"
      :editor-font-size="editorFontSize"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MyVditor from './MyVditor.vue'

const props = defineProps({
  tab: { type: Object, required: true },
  isActive: { type: Boolean, default: false },
  editorFontSize: { type: Number, default: 16 },
})

// 暴露 MyVditor 的 ref，供父组件调用其方法（如 newFile、saveMdFile 等）
const vditorRef = ref(null)

defineExpose({ vditorRef })
</script>

<style scoped>
.tab-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
