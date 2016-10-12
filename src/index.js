const Promise = require('bluebird');
const get = require('lodash.get');
const path = require('path');
const resolve = Promise.promisify(require('resolve'), {
    multiArgs: true
});
const debug = require('debug')('get-package-info');

const getInfo = (props, dir, result) => {
    if(!Array.isArray(props)) return Promise.reject(new Error('First argument must be array of properties to retrieve.'));
    if(!props.length) return Promise.resolve(result);

    debug('Getting props: ', props);
    debug('Looking up starting from directory: ', dir);
    debug('Result so far:', result);

    return resolve('package.json', {
        basedir: dir,
        moduleDirectory: '.'
    })

    .catch((err) => {
        err.message += `(Properties not found yet: ${props})`;
        throw err;
    })

    .spread((src, pkg) => {
        debug('Checking props in package.json found at:', src);
        const nextProps = [];

        props.forEach((prop) => {

            // For props given as array
            // Look for props in that order, and when found
            // save value under all given props
            if(Array.isArray(prop)) {
                let value, sourceProp;
                prop.some((p) => {
                    sourceProp = p;
                    value = get(pkg, p);
                    return value;
                });
                if(value !== undefined) {
                    debug('Found prop:', prop);
                    prop.forEach((p) => {
                        result.values[p] = value;
                        result.source[p] = { src, pkg, prop: sourceProp };
                    });
                }
                else {
                    debug('Couldn\'t find prop:', prop);
                    nextProps.push(prop);
                }
            }

            // For regular string props, just look normally
            else {
                const value = get(pkg, prop);

                if(value !== undefined) {
                    debug('Found prop:', prop);
                    result.values[prop] = value;
                    result.source[prop] = { src, pkg, prop };
                }
                else {
                    debug('Couldn\'t find prop:', prop);
                    nextProps.push(prop);
                }
            }
        });

        // Still have props to look for, look at another package.json above this one
        if(nextProps.length) {
            debug('Not all props satisfied, looking for parent package.json');
            return getInfo(nextProps, path.join(path.dirname(src), '..'), result);
        }

        debug('Found all props!');
        return result;
    });
};

module.exports = (props, dir, cb) => getInfo(props, dir, { values: {}, source: {} }).nodeify(cb);
