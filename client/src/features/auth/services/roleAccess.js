export function getAccountPath(user) {
  if (user?.role === 'ADMIN') return '/admin'
  if (user?.role === 'BUSINESS') return '/business-profile'
  if (user?.role === 'CUSTOMER') return '/profile'
  return '/login'
}

export function canSeeBusinessLinks(user) {
  return !user || user.role === 'ADMIN' || user.role === 'BUSINESS'
}

export function canAccessPath(user, path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return false
  const pathname = path.split(/[?#]/)[0].replace(/^\/b2b(?=\/|$)/, '/business')
  if (/^\/(admin(?:\/|$)|business\/(manage|accounts)(?:\/|$))/.test(pathname)) {
    return user?.role === 'ADMIN'
  }
  if (/^\/(business-profile(?:\/|$)|business\/(quote|requests)(?:\/|$))/.test(pathname)) {
    return user?.role === 'BUSINESS' && user.accountType === 'B2B'
  }
  if (/^\/profile(?:\/|$)/.test(pathname)) {
    return user?.role === 'CUSTOMER' && user.accountType === 'RETAIL'
  }
  return true
}

export function getLoginDestination(user, requestedPath) {
  const accountPath = getAccountPath(user)
  if (!requestedPath || /^\/(login|unauthorized|forgot-password|reset-password)(?:[/?#]|$)/.test(requestedPath)) return accountPath
  return canAccessPath(user, requestedPath) ? requestedPath : accountPath
}
