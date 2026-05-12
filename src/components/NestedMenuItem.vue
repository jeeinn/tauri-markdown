<template>
  <el-dropdown-item class="submenu-trigger" @click.stop>
    <el-dropdown 
      trigger="hover" 
      placement="right-start" 
      :hide-on-click="false" 
      :show-timeout="100" 
      :hide-timeout="100"
      popper-class="nested-dropdown-popper"
      class="full-width-nested-dropdown">
      <span class="submenu-trigger-content">
        <span>{{ label }}</span>
        <el-icon class="el-icon--right"><arrow-right /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <slot />
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-dropdown-item>
</template>

<script>
import { ArrowRight } from '@element-plus/icons-vue'

export default {
  name: 'NestedMenuItem',
  components: {
    ArrowRight,
  },
  props: {
    label: {
      type: String,
      required: true,
    },
  },
}
</script>

<style scoped>
.el-dropdown-menu__item.submenu-trigger {
  padding: 0 !important;
}

.el-dropdown-menu__item.submenu-trigger > .el-dropdown.full-width-nested-dropdown {
  display: block;
  width: 100%;
  height: 100%;
}

.el-dropdown-menu__item.submenu-trigger .el-dropdown__trigger {
  width: 100%;
  height: 100%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.el-dropdown-menu__item.submenu-trigger .submenu-trigger-content {
  display: flex;
  align-items: center;
  width: 100%;
  height: 36px;
  line-height: 36px;
  padding: 0 20px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  box-sizing: border-box;
  transition: all 0.3s;
}

.el-dropdown-menu__item.submenu-trigger .submenu-trigger-content > span:first-child {
  flex: none;
}

.el-dropdown-menu__item.submenu-trigger .submenu-trigger-content .el-icon--right {
  flex-shrink: 0;
}

.el-dropdown-menu__item.submenu-trigger .submenu-trigger-content:hover {
  color: #409eff;
  background-color: #f5f7fa;
}


</style>