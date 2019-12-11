const path = require('path');
const fs = require('fs-extra');
const glob = require('glob');
const _ = require('lodash');
const Svgo = require('svgo');
const parser = require("posthtml-parser");
const ora = require('ora');
const cwd = process.cwd();

let spinner;
const svg2htmlLib = {
  travelAll: false,

  async run({ inDir, outDir, rmAttr = '', exclude = 'node_modules' }) {
    this.inDir = inDir;
    this.outDir = outDir;
    this.rmAttr = rmAttr;
    this.exclude = exclude.split('|');

    spinner = ora('Loading...').start();

    this.svgo = new Svgo({
      plugins: [{
        removeAttrs: { attrs: `(${rmAttr})` },
      }]
    });

    const stat = fs.lstatSync(_.head(inDir));
    this.outDir = path.isAbsolute(outDir) ? outDir : path.join(cwd, outDir, '/');

    if (inDir.length < 2 && stat.isDirectory()) {
      const files = await this.globPromise(`${inDir}/**/*.svg`);

      inDir = _.head(inDir);
      inDir = path.isAbsolute(inDir) ? inDir : path.join(cwd, inDir, '/');

      await this.svg2html(inDir, this.outDir);
      await this.generateAllHtml(files);
    } else {
      await this.handlerFiles(inDir);
    }
  },

  async svg2html(inDir, outDir) {
    this.handlerDir(inDir, outDir);
  },

  async handlerDir(inDir, outDir) {
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
    await this.generateIndexHtml(svgs, outDir);

    folders.map((folder) => {
      const subInDir = path.join(inDir, folder, '/');
      const subOutDir = path.join(outDir, folder, '/');

      this.svg2html(subInDir, subOutDir);
    });
  },

  async handlerFiles(inDir) {
    inDir = inDir.map((item) => {
      return path.isAbsolute(item) ? item : path.join(cwd, item)
    })
    await this.generateAllHtml(inDir);
  },

  buildHtml(svgs) {
    _.each(svgs, (values, key) => {
      svgs[key] = values.map((svgFile) => {
        const svgCont = fs.readFileSync(svgFile, 'utf-8');
        const svgParserTag = _.find(parser(svgCont), {tag: 'svg'});
        const svgParserWidth = svgParserTag.attrs.width
        const svgXlinkHrefReg = /xlink:href=['"]#(\w+)?['"]/;
        const svgBlockWidth = 100;
        const svgBlockSize = 1 / 2;

        return this.svgo.optimize(svgCont, { path: svgFile }).then(function (result) {
          const xlinkHrefMatch = result.data.match(new RegExp(svgXlinkHrefReg, 'g'))
          if (xlinkHrefMatch) {
            _.uniq(xlinkHrefMatch).map((matchstr) => {
              const oldId = matchstr.match(svgXlinkHrefReg)[1];
              const idReg = new RegExp(`id=['"]${oldId}?['"]`)
              const random = _.random(1, 100);
              const now = Date.now();
              const newId = `${oldId}_${now}_${random}`;
              result.data = result.data.replace(idReg, `id="${newId}"`);
              result.data = result.data.replace(new RegExp(matchstr, 'g'), matchstr.replace(`#${oldId}`, `#${newId}`));
            });
          }

          return {
            content: result.data,
            name: path.parse(svgFile).name,
            scale: svgParserWidth ? (svgBlockWidth * svgBlockSize) / Number(svgParserWidth.replace(/\D+/, '')) : svgBlockSize
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

  async generateAllHtml(svgs) {
    if (!this.travelAll) {
      this.travelAll = true;
      const allSvgMap = this.buildSvgMap(svgs);

      _.each(allSvgMap, (value, key) => {
        if (this.exclude.includes(key.split('/').pop())) {
          delete allSvgMap[key];
        }
      });

      const html = await this.buildHtml(allSvgMap);
      fs.outputFile(`${this.outDir}/all.html`, html);
      this.travelAll = false;
    }
    spinner.stop();
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