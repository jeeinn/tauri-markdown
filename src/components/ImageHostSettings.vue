<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t.title"
    width="750px"
    :close-on-click-modal="false"
    @close="handleClose"
    class="image-host-dialog"
    style="max-height: 90vh; --el-dialog-padding-primary: 15px;"
    top="5vh"
  >
    <div class="image-host-settings">
      <!-- 顶部:功能开关 -->
      <div class="settings-header">
        <el-switch
          v-model="config.enabled"
          :active-text="t.enableLabel"
          size="large"
        />
        <p class="settings-description">{{ t.enableDescription }}</p>
      </div>

      <el-divider />

      <!-- 中部:图床类型选择和配置表单 -->
      <div class="settings-body">
        <el-row :gutter="15">
          <!-- 左侧:图床类型选择 -->
          <el-col :span="7">
            <div class="host-type-selector">
              <div
                v-for="host in hostTypes"
                :key="host.value"
                class="host-type-item"
                :class="{ active: config.current === host.value }"
                @click="selectHostType(host.value)"
              >
                <el-icon><component :is="host.icon" /></el-icon>
                <span>{{ host.label }}</span>
              </div>
            </div>
          </el-col>

          <!-- 右侧:配置表单 -->
          <el-col :span="17">
            <el-form
              ref="formRef"
              :model="currentConfig"
              :rules="formRules"
              label-width="100px"
              class="config-form"
            >
              <!-- SM.MS 配置 -->
              <template v-if="config.current === 'smms'">
                <el-form-item :label="t.labels.token" prop="token">
                  <el-input
                    v-model="currentConfig.token"
                    type="password"
                    show-password
                    :placeholder="t.placeholders.smmsToken"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.backupDomain" prop="backupDomain">
                  <el-input
                    v-model="currentConfig.backupDomain"
                    :placeholder="t.placeholders.backupDomain"
                  />
                </el-form-item>
              </template>

              <!-- GitHub 配置 -->
              <template v-if="config.current === 'github'">
                <el-form-item :label="t.labels.repo" prop="repo">
                  <el-input
                    v-model="currentConfig.repo"
                    :placeholder="t.placeholders.repo"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.branch" prop="branch">
                  <el-input
                    v-model="currentConfig.branch"
                    :placeholder="t.placeholders.branch"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.token" prop="token">
                  <el-input
                    v-model="currentConfig.token"
                    type="password"
                    show-password
                    :placeholder="t.placeholders.token"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.path" prop="path">
                  <el-input
                    v-model="currentConfig.path"
                    :placeholder="t.placeholders.path"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.customUrl" prop="customUrl">
                  <el-input
                    v-model="currentConfig.customUrl"
                    :placeholder="t.placeholders.customUrl"
                  />
                </el-form-item>
              </template>

              <!-- Gitee 配置 (兼容 PicGo gitee 插件) -->
              <template v-if="config.current === 'gitee'">
                <el-form-item :label="t.labels.owner" prop="owner">
                  <el-input
                    v-model="currentConfig.owner"
                    :placeholder="t.placeholders.owner"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.repo" prop="repo">
                  <el-input
                    v-model="currentConfig.repo"
                    :placeholder="t.placeholders.ownerRepo"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.branch" prop="branch">
                  <el-input
                    v-model="currentConfig.branch"
                    :placeholder="t.placeholders.branch"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.token" prop="token">
                  <el-input
                    v-model="currentConfig.token"
                    type="password"
                    show-password
                    :placeholder="t.placeholders.giteeToken"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.path" prop="path">
                  <el-input
                    v-model="currentConfig.path"
                    :placeholder="t.placeholders.path"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.customUrl" prop="customUrl">
                  <el-input
                    v-model="currentConfig.customUrl"
                    :placeholder="t.placeholders.giteeCustomUrl"
                  />
                </el-form-item>
              </template>

              <!-- 阿里云 OSS 配置 -->
              <template v-if="config.current === 'aliyun_oss'">
                <el-form-item :label="t.labels.accessKeyId" prop="accessKeyId">
                  <el-input
                    v-model="currentConfig.accessKeyId"
                    type="password"
                    show-password
                    :placeholder="t.labels.accessKeyId"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.accessKeySecret" prop="accessKeySecret">
                  <el-input
                    v-model="currentConfig.accessKeySecret"
                    type="password"
                    show-password
                    :placeholder="t.labels.accessKeySecret"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.bucket" prop="bucket">
                  <el-input
                    v-model="currentConfig.bucket"
                    :placeholder="t.placeholders.bucket"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.area" prop="area">
                  <el-select v-model="currentConfig.area" :placeholder="t.placeholders.area">
                    <el-option :label="t.areaOptions.z0" value="z0" />
                    <el-option :label="t.areaOptions.z1" value="z1" />
                    <el-option :label="t.areaOptions.z2" value="z2" />
                    <el-option :label="t.areaOptions.na0" value="na0" />
                    <el-option :label="t.areaOptions.as0" value="as0" />
                  </el-select>
                </el-form-item>
                <el-form-item :label="t.labels.path" prop="path">
                  <el-input
                    v-model="currentConfig.path"
                    :placeholder="t.placeholders.path"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.customUrl" prop="customUrl">
                  <el-input
                    v-model="currentConfig.customUrl"
                    :placeholder="t.placeholders.aliyunCustomUrl"
                  />
                </el-form-item>
                <el-form-item :label="t.labels.options" prop="options">
                  <el-input
                    v-model="currentConfig.options"
                    :placeholder="t.placeholders.options"
                  />
                </el-form-item>
              </template>

              <!-- 未选择图床类型时的提示 -->
              <el-empty
                v-if="!config.current"
                :description="t.selectHostType"
                :image-size="100"
              />
            </el-form>
          </el-col>
        </el-row>
      </div>

      <el-divider />

      <!-- 底部:导入和操作按钮 -->
      <div class="settings-footer">
        <div class="import-section">
          <el-button
            type="primary"
            size="small"
            :loading="importing"
            @click="handleImportPicgo"
            plain
          >
            {{ t.importConfig }}
          </el-button>
          <el-button
            size="small"
            @click="handleReset"
          >
            {{ t.resetConfig }}
          </el-button>
        </div>

        <div class="action-buttons">
          <el-button @click="handleClose" size="small">{{ t.cancel }}</el-button>
          <el-button type="primary" @click="handleTestConnection" :loading="testing" size="small">
            {{ t.testConnection }}
          </el-button>
          <el-button type="success" @click="handleSave" :loading="saving" size="small">
            {{ t.save }}
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture, Connection, Upload, Cloudy } from '@element-plus/icons-vue'
import { getI18nConfig } from '../utils/i18n-helper.js'
import { saveImageHostConfig, getImageHostConfig, importPicgoConfig, testImageHostConnection } from '../utils/image-host-config.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  lang: {
    type: String,
    default: 'zh_CN'
  }
})

const emit = defineEmits(['update:modelValue'])

// 获取当前语言的文本
const t = computed(() => getI18nConfig(props.lang).notifications.imageHost)

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 图床类型列表
const hostTypes = [
  { value: 'smms', label: 'SM.MS', icon: Picture },
  { value: 'github', label: 'GitHub', icon: Connection },
  { value: 'gitee', label: 'Gitee', icon: Upload },
  { value: 'aliyun_oss', label: '阿里云 OSS', icon: Cloudy }
]

// 配置数据
const config = ref({
  enabled: false,
  current: '',
  smms: { token: '', backupDomain: '' },
  github: { repo: '', branch: 'master', token: '', path: '', customUrl: '' },
  gitee: { owner: '', repo: '', branch: 'master', token: '', path: '', customUrl: '' },
  aliyun_oss: { accessKeyId: '', accessKeySecret: '', bucket: '', area: 'z0', path: '', customUrl: '', options: '' }
})

// 表单引用
const formRef = ref(null)

// 加载状态
const saving = ref(false)
const testing = ref(false)
const importing = ref(false)

// 当前图床的配置
const currentConfig = computed(() => {
  if (!config.value.current) return {}
  return config.value[config.value.current] || {}
})

// 表单验证规则
const formRules = computed(() => {
  const rules = {}
  const v = t.value.validationMessages
  
  if (config.value.current === 'smms') {
    rules.token = [{ required: true, message: v.tokenRequired, trigger: 'blur' }]
  } else if (config.value.current === 'github') {
    rules.repo = [{ required: true, message: v.repoRequired, trigger: 'blur' }]
    rules.token = [{ required: true, message: v.tokenRequired, trigger: 'blur' }]
  } else if (config.value.current === 'gitee') {
    rules.owner = [{ required: true, message: v.ownerRequired, trigger: 'blur' }]
    rules.repo = [{ required: true, message: v.repoRequired, trigger: 'blur' }]
    rules.token = [{ required: true, message: v.tokenRequired, trigger: 'blur' }]
  } else if (config.value.current === 'aliyun_oss') {
    rules.accessKeyId = [{ required: true, message: v.accessKeyIdRequired, trigger: 'blur' }]
    rules.accessKeySecret = [{ required: true, message: v.accessKeySecretRequired, trigger: 'blur' }]
    rules.bucket = [{ required: true, message: v.bucketRequired, trigger: 'blur' }]
    rules.area = [{ required: true, message: v.areaRequired, trigger: 'change' }]
  }
  
  return rules
})

// 选择图床类型
const selectHostType = (type) => {
  config.value.current = type
}

// 深度合并配置,保留默认值
const deepMergeConfig = (defaults, saved) => {
  const result = { ...defaults }
  for (const key of Object.keys(saved)) {
    if (saved[key] !== null && saved[key] !== undefined) {
      if (typeof saved[key] === 'object' && !Array.isArray(saved[key]) && typeof defaults[key] === 'object' && defaults[key] !== null) {
        result[key] = deepMergeConfig(defaults[key], saved[key])
      } else {
        result[key] = saved[key]
      }
    }
  }
  return result
}

const defaultConfig = {
  enabled: false,
  current: '',
  smms: { token: '', backupDomain: '' },
  github: { repo: '', branch: 'master', token: '', path: '', customUrl: '' },
  gitee: { owner: '', repo: '', branch: 'master', token: '', path: '', customUrl: '' },
  aliyun_oss: { accessKeyId: '', accessKeySecret: '', bucket: '', area: 'z0', path: '', customUrl: '', options: '' }
}

// 加载配置 (仅从 store.json)
const loadConfig = async () => {
  try {
    const savedConfig = await getImageHostConfig()
    if (savedConfig) {
      config.value = deepMergeConfig(defaultConfig, savedConfig)
    } else {
      config.value = { ...defaultConfig }
    }
  } catch (error) {
    console.error('[ImageHost] 加载配置失败:', error)
  }
}

// 从 PicGo 导入配置
const handleImportPicgo = async () => {
  importing.value = true
  try {
    const picgoConfig = await importPicgoConfig()
    config.value = deepMergeConfig(defaultConfig, picgoConfig)
    ElMessage.success(t.value.importSuccess)
  } catch (error) {
    console.error('[ImageHost] PicGo 导入失败:', error)
    ElMessage.error(t.value.importFailed)
  } finally {
    importing.value = false
  }
}

// 重置配置
const handleReset = () => {
  // 重置为默认配置，但不保存到 store.json
  config.value = JSON.parse(JSON.stringify(defaultConfig))
  // 清空表单验证状态
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 保存配置
const handleSave = async () => {
  // 如果启用了图床但没有选择类型,提示用户
  if (config.value.enabled && !config.value.current) {
    ElMessage.warning(t.value.selectHostType)
    return
  }

  // 表单验证
  if (config.value.current && formRef.value) {
    try {
      await formRef.value.validate()
    } catch (error) {
      ElMessage.warning(t.value.fillRequiredFields)
      return
    }
  }

  saving.value = true
  try {
    await saveImageHostConfig(config.value, 'tauri_store')
    ElMessage.success(t.value.saveSuccess)
    dialogVisible.value = false
  } catch (error) {
    console.error('[ImageHost] 保存配置失败:', error)
    ElMessage.error(t.value.saveFailed)
  } finally {
    saving.value = false
  }
}

// 测试连接
const handleTestConnection = async () => {
  if (!config.value.current) {
    ElMessage.warning(t.value.selectHostType)
    return
  }

  testing.value = true
  try {
    const result = await testImageHostConnection(config.value)
    if (result.success) {
      ElMessage.success(t.value.testSuccess)
    } else {
      ElMessage.error(result.message || t.value.testFailed)
    }
  } catch (error) {
    console.error('[ImageHost] 测试连接失败:', error)
    ElMessage.error(t.value.testFailed)
  } finally {
    testing.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  dialogVisible.value = false
}

// 监听对话框打开,加载配置
watch(dialogVisible, (visible) => {
  if (visible) {
    loadConfig()
  }
})

// 组件挂载时加载配置
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.image-host-settings {
  padding: 5px 0;
  max-width: 100%;
  box-sizing: border-box;
}

.settings-header {
  margin-bottom: 5px;
}

.settings-description {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.settings-body {
  min-height: auto;
  max-height: 55vh;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

.settings-body :deep(.el-row) {
  margin-left: 0 !important;
  margin-right: 0 !important;
  width: 100%;
}

.settings-body :deep(.el-col) {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.host-type-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.host-type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 13px;
}

.host-type-item:hover {
  border-color: #409eff;
  background: #f5f7fa;
}

/* 暗色主题下的 hover 样式 */
html.dark .host-type-item:hover,
.dark .host-type-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.host-type-item.active {
  border-color: #409eff;
  background: #ecf5ff;
  color: #409eff;
}

/* 暗色主题下的选中项样式 */
html.dark .host-type-item.active,
.dark .host-type-item.active {
  background: rgba(64, 158, 255, 0.15);
  color: #66b1ff;
}

.host-type-item .el-icon {
  font-size: 16px;
}

.config-form {
  padding: 0 5px;
}

.config-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.config-form :deep(.el-form-item__label) {
  font-size: 12px;
  line-height: 1.4;
  padding-right: 8px;
}

.config-form :deep(.el-form-item__content) {
  line-height: 32px;
}

/* 增加表单项之间的间距,确保错误提示不被遮挡 */
.config-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

/* 验证失败时输入框显示红色边框 */
.config-form :deep(.el-form-item.is-error .el-input__inner),
.config-form :deep(.el-form-item.is-error .el-input__wrapper) {
  border-color: #f56c6c !important;
}

.config-form :deep(.el-form-item.is-error .el-select .el-input__wrapper) {
  border-color: #f56c6c !important;
}

.config-form :deep(.el-input__inner) {
  height: 32px;
  line-height: 32px;
  font-size: 13px;
}

.config-form :deep(.el-select) {
  width: 100%;
}

.settings-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
  width: 100%;
  overflow: hidden;
}

.import-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.action-buttons .el-button {
  padding: 8px 16px;
  font-size: 13px;
}

:deep(.el-dialog__header) {
  padding: 12px 15px;
}

:deep(.el-dialog__body) {
  padding: 15px;
  overflow-x: hidden;
}

:deep(.el-dialog__header) {
  padding: 12px 15px;
}

:deep(.el-dialog__footer) {
  padding: 10px 15px;
  overflow-x: hidden;
}

:deep(.el-divider--horizontal) {
  margin: 10px 0;
}
</style>
