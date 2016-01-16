const Promise = require('bluebird');
const get = require('lodash.get');
const path = require('path');
const resolve = Promise.promisify(require('resolve'), {
    multiArgs: true
});

const getInfo = (props, dir, result) => {
    if(!Array.isArray(props)) return Promise.reject(new Error('First argument must be array of properties to retrieve.'));
    if(!props.length) return Promise.resolve(result);

    return resolve('package.json', {
        basedir: dir,
        moduleDirectory: '.'
    })

    .spread((src, pkg) => {
        const nextProps = [];

        for(const prop of props) {

            // For props given as array
            // Look for props in that order, and when found
            // save value under all given props
            if(Array.isArray(prop)) {
                let value;
                prop.some((p) => value = get(pkg, p));
                if(value !== undefined) {
                    for(const p of prop) {
                        result.values[p] = value;
                        result.source[p] = { src, pkg };
                    }
                }
                else {
                    nextProps.push(prop);
                }
            }

            // For regular string props, just look normally
            else {
                const value = get(pkg, prop);

                if(value !== undefined) {
                    result.values[prop] = value;
                    result.source[prop] = { src, pkg };
                }
                else {
                    nextProps.push(prop);
                }
            }
        }

        // Still have props to look for, look at another package.json above this one
        if(nextProps.length) {
            return getInfo(nextProps, path.join(path.dirname(src), '..'), result);
        }

        return result;
    });
};

module.exports = (props, dir, cb) => getInfo(props, dir, { values: {}, source: {} }).nodeify(cb);
