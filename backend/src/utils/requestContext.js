export function getRequestUser(req) {
  return {
    role: String(req.headers["x-user-role"] || '').trim().toUpperCase(),
    user_id: req.headers["x-user-id"] || null,
    customer_id: req.headers["x-customer-id"] || null,
    branch_id: req.headers["x-branch-id"] || null
  };
}

export function forbidNonAdmin(req, res) {
  const user = getRequestUser(req);
  if (user.role !== 'ADMIN') {
    res.status(403).json({ message: 'This action is only available to administrators' });
    return true;
  }
  return false;
}
