#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { hexlify, arrayify } = require('fuels');

const binaryFilePath = path.join(__dirname, '../../../../multisig-predicate/simple-predicate/out/debug/simple-predicate.bin');
const abiFilePath = path.join(__dirname, '../../../../multisig-predicate/simple-predicate/out/debug/simple-predicate-abi.json');
const outputPath = path.join(__dirname, '../generated/predicateData.js');

const binaryContent = fs.readFileSync(binaryFilePath);
const abi = require(abiFilePath);

const data = `
  import { hexlify, arrayify } from 'ethers/lib/utils';
  export const abi = ${JSON.stringify(abi)};
  export const bin = hexlify(arrayify(new Uint8Array([${Array.from(binaryContent).toString()}])));
`;

fs.writeFileSync(outputPath, data);
