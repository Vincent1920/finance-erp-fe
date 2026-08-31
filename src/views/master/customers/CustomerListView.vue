<script setup lang="ts">
import MasterDataWorkspace from '@/components/master/MasterDataWorkspace.vue'
import { customerWorkspaceConfig } from '@/views/master/masterConfigs'
</script>

<template>
  <MasterDataWorkspace :config="customerWorkspaceConfig" />
</template>
