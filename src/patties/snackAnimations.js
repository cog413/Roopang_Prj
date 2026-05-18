export const SNACK_ANIMATION_MS = Object.freeze({
    DROP_MIN: 953,
    DROP_PER_PX: 8.93,
    APPLE_POP: 900,
    SURPRISE: 3000,
});

export function waitMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function waitForAnimationEnd(el, fallbackMs) {
    return new Promise(resolve => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            el?.removeEventListener('animationend', finish);
            resolve();
        };
        el?.addEventListener('animationend', finish, { once: true });
        setTimeout(finish, fallbackMs);
    });
}
