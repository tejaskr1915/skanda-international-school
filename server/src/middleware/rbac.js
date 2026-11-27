const jwt = require('jsonwebtoken');
const prisma = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'skanda_secret_jwt_key_2026_super_secure';

async function portalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.portalUserId) {
      return res.status(401).json({ success: false, message: 'Invalid portal session token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.portalUserId },
      include: { branch: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User account inactive or not found.' });
    }

    req.portalUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.portalUser || !allowedRoles.includes(req.portalUser.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`
      });
    }
    next();
  };
}

function requireModulePermission(moduleName, action = 'read') {
  return (req, res, next) => {
    const user = req.portalUser;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized.' });

    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return next();
    }

    const perms = user.permissions || {};
    const modulePerms = perms[moduleName];
    if (Array.isArray(modulePerms) && modulePerms.includes(action)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Scoped RBAC Guard: Missing '${action}' permission for module '${moduleName}'.`
    });
  };
}

async function resolveBranchId(req) {
  if (req.portalUser.role === 'SUPER_ADMIN') {
    const requested = req.headers['x-branch-id'] || req.query.branchId || req.body?.branchId;
    if (requested) return requested;
    const firstBranch = await prisma.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    return firstBranch ? firstBranch.id : null;
  }
  return req.portalUser.branchId;
}

async function getCurrentAcademicYearId(branchId) {
  const ay = await prisma.academicYear.findFirst({
    where: { branchId, isCurrent: true }
  });
  if (ay) return ay.id;
  const fallback = await prisma.academicYear.findFirst({ where: { branchId } });
  return fallback ? fallback.id : null;
}

module.exports = {
  portalAuthMiddleware,
  requireRole,
  requireModulePermission,
  resolveBranchId,
  getCurrentAcademicYearId
};
