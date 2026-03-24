<script setup>
import FeatureGrid from '@components/oss/FeatureGrid.vue'
import Footer from '@components/oss/Footer.vue'
import HeadingSection from '@components/oss/HeadingSection.vue'
import Hero from '@components/oss/Hero.vue'
import Spacer from '@components/shared/Spacer.vue'
</script>

<template>
  <Hero />

  <HeadingSection
    heading="Inspect, Analyze, Extend"
    subheading="Vite DevTools provides an extensible framework with built-in integrations like DevTools for Rolldown, plus an open architecture for custom tools."
  />

  <FeatureGrid />

  <Spacer />

  <Footer
    heading="Understand Your Vite Ecosystem Better"
    subheading="Inspect builds, analyze performance, extend with custom integrations..." button-text="Get Started"
    button-link="/guide/"
  />
</template>
