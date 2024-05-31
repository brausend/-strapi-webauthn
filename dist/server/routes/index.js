"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = [
    {
        method: 'GET',
        path: '/register/generate-options',
        handler: 'webauthnController.registerGenerateOptions',
        config: {
            auth: false,
            policies: [],
        },
    },
    {
        method: 'POST',
        path: '/register/verify/:challengeId',
        handler: 'webauthnController.registerVerify',
        config: {
            auth: false,
            policies: [],
        },
    },
    {
        method: 'GET',
        path: '/auth/generate-options',
        handler: 'webauthnController.authGenerateOptions',
        config: {
            auth: false,
            policies: [],
        },
    },
    {
        method: 'POST',
        path: '/auth/verify/:challengeId',
        handler: 'webauthnController.authVerify',
        config: {
            auth: false,
            policies: [],
        },
    },
    {
        method: 'GET',
        path: '/list',
        handler: 'webauthnController.listKeys',
        config: {
            policies: [],
        },
    },
    {
        method: 'GET',
        path: '/pre-check',
        handler: 'webauthnController.preCheck',
        config: {
            auth: false,
            policies: [],
        },
    }
];
