<script setup lang="ts">
import MasterDataWorkspace from '@/components/master/MasterDataWorkspace.vue'
import { itemWorkspaceConfig } from '@/views/master/masterConfigs'
</script>

<template>
  <MasterDataWorkspace :config="itemWorkspaceConfig" />
</template>
