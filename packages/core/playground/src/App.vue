<template>
  <Suspense>
    <RouterView />
    <template #fallback>
      <div>Loading...</div>
    </template>
  </Suspense>
</template>
