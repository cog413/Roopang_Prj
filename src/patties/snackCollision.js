export function getAppleVisualHitbox(apple) {
    const size = apple.size || 24;
    const padX = size * 0.22;
    const padY = size * 0.18;
    return {
        left: apple.x + padX,
        right: apple.x + size - padX,
        top: apple.y + padY,
        bottom: apple.y + size - padY,
        centerX: apple.x + size / 2,
        centerY: apple.y + size / 2,
    };
}

export function getPetVisualHitbox(petState) {
    const size = petState.size || 32;
    return {
        left: petState.x + size * 0.2,
        right: petState.x + size * 0.82,
        top: petState.y + size * 0.18,
        bottom: petState.y + size * 0.92,
        centerX: petState.x + size / 2,
        centerY: petState.y + size / 2,
    };
}

export function getPetFaceEdge(petState, direction) {
    const hitbox = getPetVisualHitbox(petState);
    return direction >= 0 ? hitbox.right : hitbox.left;
}

export function getSnackApproachTarget(petState, appleState) {
    const apple = getAppleVisualHitbox(appleState);
    const size = petState.size || 32;
    const approachFromLeft = apple.centerX >= petState.x + size / 2;
    const direction = approachFromLeft ? 1 : -1;
    const bodyLeftPad = size * 0.2;
    const bodyRightPad = size * 0.82;
    const gap = -9;
    const x = approachFromLeft
        ? apple.left - gap - bodyRightPad
        : apple.right + gap - bodyLeftPad;
    return {
        x,
        y: appleState.surface?.petY ?? petState.y,
        direction,
        surface: appleState.surface,
    };
}

export function isPetFaceTouchingApple(petState, appleState) {
    if (!appleState?.surface) return false;
    if (Math.abs(petState.y - appleState.surface.petY) > 4) return false;
    const target = getSnackApproachTarget(petState, appleState);
    const apple = getAppleVisualHitbox(appleState);
    const face = getPetFaceEdge(petState, target.direction);
    const distance = target.direction >= 0
        ? apple.left - face
        : face - apple.right;
    return distance >= -11 && distance <= 5;
}
