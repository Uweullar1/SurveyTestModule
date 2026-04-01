<template>
    <div class="light-rays-wrapper">
        <div class="ray-canvas"></div>
    </div>
</template>

<style scoped>
    .light-rays-wrapper {
        position: fixed;
        inset: 0;
        z-index: -1; /* Он должен быть сзади всего */
        background-color: #FDFDF1;
        overflow: hidden;
    }

    .ray-canvas {
        position: absolute;
        top: -15%;
        left: 50%;
        transform: translateX(-50%);
        width: 250vw;
        height: 150vh;
        /* Увеличиваем плотность красного до 0.15, чтобы "пробить" светлый фон */
        background: conic-gradient( from 150deg at 50% 0%, transparent 0deg, rgba(223, 41, 53, 0.15) 25deg, transparent 50deg, rgba(223, 41, 53, 0.1) 85deg, transparent 120deg );
        filter: blur(80px); /* Сильное размытие для мягкости */
        opacity: 1;
    }
</style>