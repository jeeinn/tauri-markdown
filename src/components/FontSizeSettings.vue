<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t.title"
    width="420px"
    :close-on-click-modal="false"
    @close="handleClose"
    @open="handleOpen"
  >
    <p class="font-size-description">{{ t.description }}</p>
    <div class="font-size-control">
      <el-slider
        v-model="localSize"
        :min="MIN_SIZE"
        :max="MAX_SIZE"
        :show-tooltip="false"
        @input="handlePreview"
      />
      <div class="font-size-input-row">
        <el-input-number
          v-model="localSize"
          :min="MIN_SIZE"
          :max="MAX_SIZE"
          :step="1"
          controls-position="right"
          @change="handlePreview"
        />
        <span class="font-size-unit">{{ t.unit }}</span>
      </div>
    </div>
    <template #footer>
      <el-button @click="handleReset">{{ t.reset }}</el-button>
      <el-button type="primary" @click="handleConfirm">{{ t.confirm }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getI18nConfig } from '../utils/i18n-helper.js'
import {
  DEFAULT_EDITOR_FONT_SIZE,
  MIN_EDITOR_FONT_SIZE,
  MAX_EDITOR_FONT_SIZE,
  clampEditorFontSize,
} from '../utils/store.js'

const MIN_SIZE = MIN_EDITOR_FONT_SIZE
const MAX_SIZE = MAX_EDITOR_FONT_SIZE

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  lang: {
    type: String,
    default: 'zh_CN',
  },
  fontSize: {
    type: Number,
    default: DEFAULT_EDITOR_FONT_SIZE,
  },
})

const emit = defineEmits(['update:modelValue', 'preview', 'save'])

const localSize = ref(DEFAULT_EDITOR_FONT_SIZE)
let savedOnConfirm = false

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const t = computed(() => getI18nConfig(props.lang).fontSizeSettings)

watch(
  () => props.fontSize,
  (size) => {
    if (!dialogVisible.value) {
      localSize.value = clampEditorFontSize(size)
    }
  }
)

function handleOpen() {
  localSize.value = clampEditorFontSize(props.fontSize)
}

function handlePreview() {
  emit('preview', clampEditorFontSize(localSize.value))
}

function handleReset() {
  localSize.value = DEFAULT_EDITOR_FONT_SIZE
  emit('preview', DEFAULT_EDITOR_FONT_SIZE)
}

function handleConfirm() {
  const size = clampEditorFontSize(localSize.value)
  savedOnConfirm = true
  emit('save', size)
  dialogVisible.value = false
}

function handleClose() {
  if (!savedOnConfirm) {
    emit('preview', clampEditorFontSize(props.fontSize))
  }
  savedOnConfirm = false
}
</script>

<style scoped>
.font-size-description {
  margin: 0 0 20px;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.font-size-control {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.font-size-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.font-size-unit {
  font-size: 14px;
  color: #606266;
}

html.dark .font-size-description,
.dark .font-size-description,
html.dark .font-size-unit,
.dark .font-size-unit {
  color: #cfd3dc;
}
</style>
