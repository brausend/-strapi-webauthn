"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    default: ({ env }) => ({
        origin: [],
        rpID: env.rpID || 'rpID',
        rpName: env.rpID || 'rpName'
    }),
    validator() { },
};
