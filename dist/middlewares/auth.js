import { config } from '../config';
export function authenticateRequest(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== config.security.apiSecretKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}
//# sourceMappingURL=auth.js.map