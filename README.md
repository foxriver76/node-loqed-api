# Node LOQED-API
[![NPM version](http://img.shields.io/npm/v/loqed-api.svg)](https://www.npmjs.com/package/loqed-api)
[![Downloads](https://img.shields.io/npm/dm/loqed-api.svg)](https://www.npmjs.com/package/loqed-api)

A node module for controlling the smart locks from LOQED via the LOQED API entirely written in TypeScript.

## Installation
```npm install loqed-api --production```

## Usage Example
Have a look at the `examples` folder to get started.

## Changelog

### 1.2.2 (2023-08-07)
* (foxriver76) improved types

### 1.2.1 (2023-08-07)
* (foxriver76) added missing event `GO_TO_STATE_TWIST_ASSIST_LATCH`

### 1.2.0 (2023-07-30)
* (foxriver76) added missing events `GO_TO_STATE_MANUAL_UNLOCK_BLE_OPEN`, `GO_TO_STATE_MANUAL_UNLOCK_VIA_OUTSIDE_MODULE_BUTTON` and `GO_TO_STATE_MANUAL_UNLOCK_VIA_OUTSIDE_MODULE_PIN`

### 1.1.5 (2022-09-10)
* (foxriver76) ported from cryptojs to node:crypto

### 1.1.3 (2022-09-09)
* (foxriver76) types for emitted events

### 1.1.2 (2022-09-09)
* (foxriver76) added additional events

### 1.0.0 (2022-09-09)
* (foxriver76) added webhook registration

### 0.1.2 (2022-09-09)
* (foxriver76) added new event

### 0.1.1 (2022-09-09)
* (foxriver76) implemented method to stop the webhook server

### 0.1.0 (2022-09-09)
* (foxriver76) initial release


