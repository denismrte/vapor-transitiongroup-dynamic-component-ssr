<script setup vapor>
import { ref } from 'vue'
const items = ref([1, 2, 3])
const tag = ref('section')
</script>

<template>
  <component :is="tag">
    <ol>
      <TransitionGroup name="t">
        <li v-for="i in items" :key="i">{{ i }}</li>
      </TransitionGroup>
    </ol>
  </component>
</template>
