"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passkey_1 = __importDefault(require("./passkey"));
const challenge_1 = __importDefault(require("./challenge"));
exports.default = { passkey: passkey_1.default, challenge: challenge_1.default };
