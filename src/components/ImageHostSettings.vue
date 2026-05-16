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
                <el-form-item :label="'Token'" prop="token">
                  <el-input
                    v-model="currentConfig.token"
                    type="password"
                    show-password
                    placeholder="请输入 SM.MS Token"
                  />
                </el-form-item>
                <el-form-item :label="'备用域名'" prop="backupDomain">
                  <el-input
                    v-model="currentConfig.backupDomain"
                    placeholder="例如: smms.app (可选)"
                  />
                </el-form-item>
              </template>

              <!-- GitHub 配置 -->
              <template v-if="config.current === 'github'">
                <el-form-item :label="'仓库名'" prop="repo">
                  <el-input
                    v-model="currentConfig.repo"
                    placeholder="格式: username/repo"
                  />
                </el-form-item>
                <el-form-item :label="'分支名'" prop="branch">
                  <el-input
                    v-model="currentConfig.branch"
                    placeholder="默认: main"
                  />
                </el-form-item>
                <el-form-item :label="'Token'" prop="token">
                  <el-input
                    v-model="currentConfig.token"
                    type="password"
                    show-password
                    placeholder="Personal Access Token"
                  />
                </el-form-item>
                <el-form-item :label="'存储路径'" prop="path">
                  <el-input
                    v-model="currentConfig.path"
                    placeholder="例如: images/ (可选)"
                  />
                </el-form-item>
                <el-form-item :label="'自定义域名'" prop="customDomain">
                  <el-input
                    v-model="currentConfig.customDomain"
                    placeholder="例如: https://cdn.jsdelivr.net/gh/... (可选)"
                  />
                </el-form-item>
              </template>

              <!-- Gitee 配置 -->
              <template v-if="config.current === 'gitee'">
                <el-form-item :label="'仓库名'" prop="repo">
                  <el-input
                    v-model="currentConfig.repo"
                    placeholder="格式: username/repo"
                  />
                </el-form-item>
                <el-form-item :label="'分支名'" prop="branch">
                  <el-input
                    v-model="currentConfig.branch"
                    placeholder="默认: master"
                  />
                </el-form-item>
                <el-form-item :label="'Token'" prop="token">
                  <el-input
                    v-model="currentConfig.token"
                    type="password"
                    show-password
                    placeholder="私人令牌"
                  />
                </el-form-item>
                <el-form-item :label="'存储路径'" prop="path">
                  <el-input
                    v-model="currentConfig.path"
                    placeholder="例如: images/ (可选)"
                  />
                </el-form-item>
                <el-form-item :label="'自定义域名'" prop="customDomain">
                  <el-input
                    v-model="currentConfig.customDomain"
                    placeholder="例如: https://gitee.com/.../raw/... (可选)"
                  />
                </el-form-item>
              </template>

              <!-- 阿里云 OSS 配置 -->
              <template v-if="config.current === 'aliyun_oss'">
                <el-form-item :label="'AccessKey ID'" prop="accessKeyId">
                  <el-input
                    v-model="currentConfig.accessKeyId"
                    type="password"
                    show-password
                    placeholder="AccessKey ID"
                  />
                </el-form-item>
                <el-form-item :label="'AccessKey Secret'" prop="accessKeySecret">
                  <el-input
                    v-model="currentConfig.accessKeySecret"
                    type="password"
                    show-password
                    placeholder="AccessKey Secret"
                  />
                </el-form-item>
                <el-form-item :label="'Bucket 名称'" prop="bucket">
                  <el-input
                    v-model="currentConfig.bucket"
                    placeholder="存储空间名称"
                  />
                </el-form-item>
                <el-form-item :label="'存储区域'" prop="area">
                  <el-select v-model="currentConfig.area" placeholder="请选择存储区域">
                    <el-option label="华东 z0" value="z0" />
                    <el-option label="华北 z1" value="z1" />
                    <el-option label="华南 z2" value="z2" />
                    <el-option label="北美 na0" value="na0" />
                    <el-option label="东南亚 as0" value="as0" />
                  </el-select>
                </el-form-item>
                <el-form-item :label="'存储路径'" prop="path">
                  <el-input
                    v-model="currentConfig.path"
                    placeholder="例如: images/ (可选)"
                  />
                </el-form-item>
                <el-form-item :label="'自定义域名'" prop="url">
                  <el-input
                    v-model="currentConfig.url"
                    placeholder="例如: https://your-domain.com (可选)"
                  />
                </el-form-item>
                <el-form-item :label="'URL 后缀'" prop="options">
                  <el-input
                    v-model="currentConfig.options"
                    placeholder="例如: ?imgslim (可选)"
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

      <!-- 底部:存储方式选择和操作按钮 -->
      <div class="settings-footer">
        <div class="storage-type-section">
          <span class="storage-type-label">{{ t.storageType.label }}</span>
          <el-radio-group v-model="storageType" size="small">
            <el-radio value="tauri_store">{{ t.storageType.tauriStore }}</el-radio>
            <el-radio value="picgo_native">{{ t.storageType.picgoNative }}</el-radio>
          </el-radio-group>
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
import { saveImageHostConfig, getImageHostConfig, testImageHostConnection } from '../utils/image-host-config.js'

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
  github: { repo: '', branch: 'main', token: '', path: '', customDomain: '' },
  gitee: { repo: '', branch: 'master', token: '', path: '', customDomain: '' },
  aliyun_oss: { accessKeyId: '', accessKeySecret: '', bucket: '', area: 'z0', path: '', url: '', options: '' }
})

// 存储方式
const storageType = ref('tauri_store')

// 表单引用
const formRef = ref(null)

// 加载状态
const saving = ref(false)
const testing = ref(false)

// 当前图床的配置
const currentConfig = computed(() => {
  if (!config.value.current) return {}
  return config.value[config.value.current] || {}
})

// 表单验证规则
const formRules = computed(() => {
  const rules = {}
  
  if (config.value.current === 'smms') {
    rules.token = [{ required: true, message: 'Token 不能为空', trigger: 'blur' }]
  } else if (config.value.current === 'github' || config.value.current === 'gitee') {
    rules.repo = [{ required: true, message: '仓库名不能为空', trigger: 'blur' }]
    rules.token = [{ required: true, message: 'Token 不能为空', trigger: 'blur' }]
  } else if (config.value.current === 'aliyun_oss') {
    rules.accessKeyId = [{ required: true, message: 'AccessKey ID 不能为空', trigger: 'blur' }]
    rules.accessKeySecret = [{ required: true, message: 'AccessKey Secret 不能为空', trigger: 'blur' }]
    rules.bucket = [{ required: true, message: 'Bucket 名称不能为空', trigger: 'blur' }]
    rules.area = [{ required: true, message: '存储区域不能为空', trigger: 'change' }]
  }
  
  return rules
})

// 选择图床类型
const selectHostType = (type) => {
  config.value.current = type
}

// 加载配置
const loadConfig = async () => {
  try {
    const savedConfig = await getImageHostConfig()
    if (savedConfig) {
      config.value = { ...config.value, ...savedConfig }
    }
  } catch (error) {
    console.error('[ImageHost] 加载配置失败:', error)
  }
}

// 保存配置
const handleSave = async () => {
  // 如果启用了图床但没有选择类型,提示用户
  if (config.value.enabled && !config.value.current) {
    ElMessage.warning(t.value.selectHostType)
    return
  }

  // 如果选择了图床类型但未启用,自动启用
  if (!config.value.enabled && config.value.current) {
    config.value.enabled = true
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
    await saveImageHostConfig(config.value, storageType.value)
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

.host-type-item.active {
  border-color: #409eff;
  background: #ecf5ff;
  color: #409eff;
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

.storage-type-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.storage-type-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.storage-type-section :deep(.el-radio) {
  margin-right: 12px;
  font-size: 12px;
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
