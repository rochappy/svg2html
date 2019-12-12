# svg2html

<img src="/docs/svg2html.png" alt="svg2html" />

# Overview
Find the `*.svg` generated `index.html` file in a recursive folder. The root file will generate all svg icons with `all.html`, and other svg that generate the current directory.

## Usage
Install with npm

```bash
npm i svg2html
```

```javascript
const svg2html = require('svg2html')

// directory
svg2html.run({
    inDir: 'test/icons',
    outDir: 'test/build',
    exclude: 'linecons',
    rmAttr: 'opacity|fill',
});

// svg file
svg2html.run({
    inDir: 'test/icons/brands/bing.svg',
    outDir: 'test/build',
    exclude: 'linecons',
    rmAttr: 'opacity|fill',
});
// multiple svg
svg2html.run({
    inDir: ['test/icons/brands/bing.svg', 'test/icons/brands/github.svg', ...],
    outDir: 'test/build',
    exclude: 'linecons',
    rmAttr: 'opacity|fill',
});


```

## svg2html.run(options)
* **inDir** `{String|Array}` required
* **outDir** `{String}` required
* **exclude** `{String}`
    * default: `'node_modules'`
    * example: `'test|node_modules'`

* **rmAttr** `{String}`
    * example: `'fill|opacity|stroke'`

## CLI
`svg2html.js -i test/icons -o test/build -r 'opacity|fill' -e 'linecons'`

```
Usage: svg2html [options]

Options:
  -v, --version            output the version number
  -i, --inDir <inDir>      svg input directory or svg paths(examples: ./test/a.svg, ./test/b.svg
  -o, --outDir <outDir>    svg output directory
  -r, --rmAttr [rmAttr]    svg remove attr, for example: "fill" or "stroke|fill|opacity" (default: "")
  -e, --exclude [exclude]  exclude directory, for example: "test" or "test|node_modules" (default: "node_modules")
  -h, --help               output usage information
```

