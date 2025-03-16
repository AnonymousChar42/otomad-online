<template>
  <div ref="container" class="three-container"></div>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { onMounted, onUnmounted, ref } from 'vue';

// 定义 DOM 容器引用
const container = ref<HTMLElement | null>(null);

// 定义 Three.js 相关变量
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let material: THREE.PointsMaterial;
let mouseX = 0;
let mouseY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

// 初始化函数
const init = () => {
  if (!container.value) return;

  // 初始化相机
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 2, 2000);
  camera.position.z = 1000;

  // 初始化场景
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.001);
  scene.background = new THREE.Color(0x050505);

  // 创建粒子几何体
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];

  // 加载纹理
  const textureLoader = new THREE.TextureLoader();
  const sprite = textureLoader.load('assets/disc.png');
  sprite.colorSpace = THREE.SRGBColorSpace;

  // 生成随机粒子位置
  for (let i = 0; i < 10000; i++) {
    const x = 2000 * Math.random() - 1000;
    const y = 2000 * Math.random() - 1000;
    const z = 2000 * Math.random() - 1000;
    vertices.push(x, y, z);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  // 创建粒子材质
  material = new THREE.PointsMaterial({
    size: 35,
    sizeAttenuation: true,
    map: sprite,
    alphaTest: 0.5,
    transparent: true,
  });
  material.color.setHSL(1.0, 0.3, 0.7, THREE.SRGBColorSpace);

  // 创建粒子系统
  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // 初始化渲染器
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.value.appendChild(renderer.domElement);

  // 事件监听
  document.body.style.touchAction = 'none';
  document.body.addEventListener('pointermove', onPointerMove);
  window.addEventListener('resize', onWindowResize);
};

// 窗口大小调整事件
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

// 鼠标移动事件
const onPointerMove = (event: PointerEvent) => {
  if (event.isPrimary === false) return;

  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
};

// 渲染函数
const render = () => {
  const time = Date.now() * 0.00005;

  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (-mouseY - camera.position.y) * 0.05;

  camera.lookAt(scene.position);

  const h = ((360 * (1.0 + time)) % 360) / 360;
  material.color.setHSL(h, 0.5, 0.5);

  renderer.render(scene, camera);
};

// 动画循环
const animate = () => {
  requestAnimationFrame(animate);
  render();
};

// 组件挂载时初始化
onMounted(() => {
  init();
  animate();
});

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
  document.body.removeEventListener('pointermove', onPointerMove);
  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
.three-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>