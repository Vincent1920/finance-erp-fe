<script setup lang="ts">
import MasterDataWorkspace from '@/components/master/MasterDataWorkspace.vue'
import { unitWorkspaceConfig } from '@/views/master/masterConfigs'
</script>

<template>
  <MasterDataWorkspace :config="unitWorkspaceConfig" />
</template>
