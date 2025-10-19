import path from 'path';
import { config } from 'dotenv';
config();
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const baseDir = isProduction ? __dirname : 'src';
console.log(`Module alias configured for ${nodeEnv} environment, base directory: ${baseDir}`);
export const moduleAliases = {
    '#src': baseDir,
    '#templates': path.join(baseDir, 'templates'),
    '#config': path.join(baseDir, 'config'),
    '#controllers': path.join(baseDir, 'controllers'),
    '#schemas': path.join(baseDir, 'schemas'),
    '#jobs': path.join(baseDir, 'jobs'),
    '#workers': path.join(baseDir, 'workers'),
    '#queues': path.join(baseDir, 'queues'),
    '#middleware': path.join(baseDir, 'middleware'),
    '#services': path.join(baseDir, 'services'),
    '#routes': path.join(baseDir, 'routes'),
    '#lib': path.join(baseDir, 'lib'),
    '#cron': path.join(baseDir, 'cron'),
    '#monitoring': path.join(baseDir, 'monitoring'),
    '#docs': path.join(baseDir, 'docs'),
};
export default moduleAliases;
//# sourceMappingURL=module-alias.js.map