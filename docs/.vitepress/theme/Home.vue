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
    subheading="Vite DevTools not only provides built-in features, but also a extensible architecture for custom integrations."
  />

  <FeatureGrid />

  <Spacer />

  <Footer
    heading="Understand your Vite App Better"
    subheading="Visually inspect modules, plugins, chunks, assets, packages..." button-text="Get Started"
    button-link="/guide/"
  />
</template>
