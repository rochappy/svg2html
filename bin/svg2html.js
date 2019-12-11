#!/usr/bin/env node
const svg2html = require('../lib');
const program = require('commander');
const assert = require('assert');
const pkg = require('../package.json');

const list = (val) => {
  return val.split(',').map((item) => {
    return item.trim()
  });
}

program.version(pkg.version, '-v, --version');

program
  .option('-i, --inDir <inDir>', 'svg input directory', list)
  .option('-o, --outDir <outDir>', 'svg output directory')
  .option('-r, --rmAttr [rmAttr]', 'svg remove attr, for example: "fill" or "stroke|fill|opacity"', '')
  .option('-e, --exclude [exclude]', 'exclude directory, for example: "test" or "test|node_modules"', 'node_modules')

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}

if (!program.inDir || !program.outDir) {
  throw new Error('options -i and -o can not empty');
}

svg2html.run({
  ...program
});