const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const _ = require('lodash');
const Svgo = require('svgo');
const ora = require('ora');
const cwd = process.cwd();

let spinner;
const svg2htmlLib = {
  travelAll: false,

  run({ inDir, outDir, rmAttr = '', exclude = 'node_modules' }) {
    this.inDir = inDir;
    this.outDir = outDir;
    this.rmAttr = rmAttr;
    this.exclude = exclude.split('|');

    spinner = ora('Loading...').start();

    svgo = new Svgo({
      plugins: [{
        removeAttrs: { attrs: `(${rmAttr})` },
      }]
    });

    this.svg2html({
      inDir,
      outDir,
    });
  },

  svg2html({ inDir, outDir }) {
    inDir = path.isAbsolute(inDir) ? inDir : path.join(cwd, inDir, '/');
    outDir = path.isAbsolute(outDir) ? outDir : path.join(cwd, outDir, '/');

    const dirents = fs.readdirSync(inDir, {
      withFileTypes: true
    });

    const svgs = dirents.filter((dirent) => {
      return /\.svg$/.test(dirent.name);
    }).map(dirent => `${inDir}/${dirent.name}`);

    const folders = dirents.filter((dirent) => {
      return dirent.isDirectory()
    }).map(dirent => dirent.name)
      .filter(name => !this.exclude.includes(name));

    // DLR
    this.createHtml(svgs, outDir);

    folders.map((folder) => {
      const subInDir = path.join(inDir, folder, '/');
      const subOutDir = path.join(outDir, folder, '/');

      this.svg2html({
        inDir: subInDir,
        outDir: subOutDir,
      });
    });
  },

  createHtml(svgs, outDir) {
    this.generateAllHtml().then(() => {
      return this.generateIndexHtml(svgs, outDir);
    }).then(() => {
      spinner.stop();
    });
  },

  buildHtml(svgs) {
    _.each(svgs, (values, key) => {
      svgs[key] = values.map((svgFile) => {
        const svgCont = fs.readFileSync(svgFile, 'utf-8');
        const svgWidth = svgCont.match(/width=['"](\d+)['"]/)[1];

        return svgo.optimize(svgCont, { path: svgFile }).then(function (result) {
          return {
            content: result.data,
            name: path.parse(svgFile).name,
            scale: (100 - 50) / svgWidth,
          };
        });
      });
    });

    return new Promise((resolve, reject) => {
      const buildSvgs = {};

      _.each(svgs, (values, key) => {
        Promise.all(values).then((res) => {
          buildSvgs[key.replace(process.env.HOME, '')] = res;
          return buildSvgs;
        }).then((res) => {
          const template = fs.readFileSync(`${__dirname}/templates/index.html`, 'utf-8');
          const html = _.template(template)({
            svgs: res,
          });

          resolve(html);
        }).catch((reason)=> {
          reject(reason);
        });
      });
    });

  },

  generateIndexHtml(svgs, outDir) {
    if (svgs.length) {
      const allSvgMap = this.buildSvgMap(svgs);

      return this.buildHtml(allSvgMap).then((html) => {
        fs.outputFile(`${outDir}/index.html`, html);
      });
    } else {
      return Promise.resolve();
    }
  },

  buildSvgMap(svgs) {
    const allSvgMap = {};

    svgs.map((file) => {
      let list = allSvgMap[path.dirname(file)];
      if (!list) {
        list = allSvgMap[path.dirname(file)] = [];
      }
      list.push(file);
    });
    return allSvgMap;
  },

  generateAllHtml() {
    if (!this.travelAll) {
      this.travelAll = true;
      return this.globPromise(`${this.inDir}/**/*.svg`).then((files) => {
        const allSvgMap = this.buildSvgMap(files);

        _.each(allSvgMap, (value, key) => {
          if (this.exclude.includes(key.split('/').pop())) {
            delete allSvgMap[key];
          }
        });

        return this.buildHtml(allSvgMap).then((html) => {
          fs.outputFile(`${this.outDir}/all.html`, html);
        });
      });
    } else {
      return Promise.resolve();
    }
  },

  globPromise(pattern, options) {
    return new Promise((resolve, reject) => {
      glob(pattern, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });
  }
};

module.exports = svg2htmlLib;