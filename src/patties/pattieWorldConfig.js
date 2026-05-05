export const pattieWorldConfig = {
    zones: [
        {
            id: 'sheet-zone',
            type: 'walkable',
            selector: "[data-pattie-zone='sheet']",
            behavior: ['walk', 'idle', 'jump'],
            weights: { walk: 65, idle: 25, jump: 5, sleep: 5 },
        },
        {
            id: 'chart-zone',
            type: 'terrain',
            selector: "[data-pattie-zone='chart']",
            behavior: ['walk', 'idle', 'jump', 'climb'],
            weights: { walk: 45, idle: 20, jump: 15, climb: 15, sleep: 5 },
        },
        {
            id: 'card-zone',
            type: 'platform',
            selector: "[data-pattie-zone='card']",
            behavior: ['walk', 'idle', 'jump'],
            weights: { walk: 50, idle: 30, jump: 10, sleep: 10 },
        },
        {
            id: 'blocked-zone',
            type: 'blocked',
            selector: "[data-pattie-zone='blocked']",
            behavior: [],
            weights: {},
        },
    ],
    terrainRules: {
        cellBorder: { canWalk: true, canJump: true },
        chartBar: { canClimb: true, canStand: true, selector: "[data-pattie-terrain='chart-bar']" },
        cardEdge: { canJump: true, canStand: true },
    },
    movement: {
        frameDurationMs: 500,
        stepPx: 1.35,
        decisionMs: 2600,
        sleepAfterMs: 45000,
        spriteSize: 32,
    },
};
