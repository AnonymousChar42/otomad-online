<style scoped>
/* this button is inspired from this -- s://www.newline.co/pricing */
button {
  --width: 100px;
  --timing: 2s;
  border: 0;
  color: rgba(255, 255, 255, 0.767);
  font-weight: bold;
  background: none;
  transition: all 0.2s;
  border-radius: 3px;
  cursor: pointer;
  padding: 6px 15px;
  border: solid 2px var(--el-color-primary);
}

button:hover {
  background-image: linear-gradient(to right,
      rgb(250, 82, 82),
      rgb(250, 82, 82) 16.65%,
      rgb(190, 75, 219) 16.65%,
      rgb(190, 75, 219) 33.3%,
      rgb(76, 110, 245) 33.3%,
      rgb(76, 110, 245) 49.95%,
      rgb(64, 192, 87) 49.95%,
      rgb(64, 192, 87) 66.6%,
      rgb(250, 176, 5) 66.6%,
      rgb(250, 176, 5) 83.25%,
      rgb(253, 126, 20) 83.25%,
      rgb(253, 126, 20) 100%,
      rgb(250, 82, 82) 100%);
  animation: var(--timing) linear dance6123 infinite;
  transform: scale(1.2) translateY(-1px);
  border-color: transparent;
}

@keyframes dance6123 {
  to {
    background-position: var(--width);
  }
}
</style>

<template>
  <button>
    <slot></slot>
  </button>
</template>