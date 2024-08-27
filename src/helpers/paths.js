const path = require('path');
const os = require('os');
const resolvePath = p => {
    let homedP = p.replace("~", os.homedir());
    if (homedP.startsWith('^')) {
        return path.resolve(
            path.join(
                __dirname,
                '..',
                '..',
                homedP.slice(1)
            )
        );
    } else {
        return path.resolve(homedP);
    }
}

module.exports = {resolvePath};
