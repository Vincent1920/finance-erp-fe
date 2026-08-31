<script setup lang="ts">
import MasterDataWorkspace from '@/components/master/MasterDataWorkspace.vue'
import { supplierWorkspaceConfig } from '@/views/master/masterConfigs'
</script>

<template>
  <MasterDataWorkspace :config="supplierWorkspaceConfig" />
</template>
