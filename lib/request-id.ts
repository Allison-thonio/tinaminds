import { randomBytes } from 'node:crypto'
export function requestId(): string { return randomBytes(4).toString('hex') }
