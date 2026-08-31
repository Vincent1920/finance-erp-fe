<script setup lang="ts">
import MasterDataWorkspace from '@/components/master/MasterDataWorkspace.vue'
import { warehouseWorkspaceConfig } from '@/views/master/masterConfigs'
</script>

<template>
  <MasterDataWorkspace :config="warehouseWorkspaceConfig" />
</template>
