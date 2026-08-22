<script setup lang="ts">
import { Line, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)
defineProps<{
  title: string
  labels: string[]
  series: { label: string; data: number[]; color: string }[]
  type?: 'line' | 'bar'
}>()
const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      align: 'end' as const,
      labels: { usePointStyle: true, boxWidth: 7 },
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: { border: { display: false }, grid: { color: '#f1f5f9' } },
  },
}
</script>
<template>
  <section class="panel p-5">
    <h2 class="font-semibold">{{ title }}</h2>
    <div class="mt-4 h-64">
      <component
        :is="type === 'bar' ? Bar : Line"
        :data="{
          labels,
          datasets: series.map((s) => ({
            label: s.label,
            data: s.data,
            borderColor: s.color,
            backgroundColor: s.color + (type === 'bar' ? 'cc' : '18'),
            fill: type !== 'bar',
            tension: 0.35,
            borderRadius: 4,
          })),
        }"
        :options="options"
      />
    </div>
  </section>
</template>
