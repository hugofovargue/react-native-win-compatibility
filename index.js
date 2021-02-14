const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();
const log = console.log;

/**
 * Fetch list of libraries from `react-native-directory`.
 * 
 * @returns {Promise}
 */
const getLibraryList = new Promise((resolve, reject) => {
  https.get(process.env.github_json_path, (res) => {
    log(`fetching packages list from react-native-directory repo...`);
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      resolve(JSON.parse(data));
    })
  }).on('error', (err) => {
    if (err) reject(err);
  });
});

/**
 * Reads package.json from filesystem.
 * 
 * @returns {Promise}
 */
const getPackageJson = new Promise((resolve, reject) => {
  log('Reading local package.json file...');

  fs.readFile(process.env.package_json_path, { encoding: 'utf-8' }, (err, data) => {
    if (err) throw reject(err);
    resolve(JSON.parse(data));
  });
});

/**
 * Filter libraryList matching the `githubUrl` and comparing the `npmPkg` value when available.
 * Returns a reduced array.
 * 
 * @param {Object} libraryList 
 * @param {Object} allDependencies 
 * @
 */
function reduceLibraryList(libraryList, allDependencies) {
  let deps = Object.keys(allDependencies);

  return libraryList.reduce((acc, lib) => {
    deps.some((d, index) => {
      if (lib.npmPkg === d || githubUrlMatch(lib.githubUrl, d)) {
        deps.splice(index, 1);  // ignoring non-immutability
        acc = { ...acc, [d]: lib };
      }
    });

    return acc;
  }, {});
};

/**
 * RegEx string match `githubURL`
 * @param {string} url 
 * @param {string} depName 
 * @returns {array || null} array or null
 */
const githubUrlMatch = (url, depName) => {
  const path = url.slice(url.lastIndexOf('/'), url.length);
  const re = new RegExp(`${depName}`, "g");
  return path.match(re);
}

function printSupportTable(dependencies) {
  let totalWinSupport = 0;

  const table = Object.keys(dependencies).map(d => {
    // Deconstruct and discard unused properties
    const { githubUrl, nameOverride, images, goldstar, examples, npmPkg, dev, ...rest } = dependencies[d];
    if (rest.windows) totalWinSupport += 1;

    return { name: d, ...rest };
  });

  console.table(table);
  console.log(`totalWinSupport: ${totalWinSupport}`);
}

/**
 * Main
 */
(async () => {
  const [libraryList, packageObj] = await Promise.all([
    getLibraryList,
    getPackageJson
  ]);

  const allDependencies = { ...packageObj.dependencies, ...packageObj.devDependencies, ...packageObj.peerDependencies };

  const dependencies = reduceLibraryList(libraryList, allDependencies);

  log(`${Object.keys(dependencies).length} total packages found in package.json that exist in react-native-directory...`);
  printSupportTable(dependencies);

  debugger;
})();
