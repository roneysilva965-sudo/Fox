import { methodNotAllowed, notFound, parseRequestUrl } from './http.js';

function matchPath(routePath, pathname) {
  const routeParts = routePath.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (routeParts.length !== pathParts.length) {
    return null;
  }

  const params = {};
  for (let index = 0; index < routeParts.length; index += 1) {
    const routePart = routeParts[index];
    const pathPart = pathParts[index];

    if (routePart.startsWith(':')) {
      params[routePart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }

    if (routePart !== pathPart) {
      return null;
    }
  }

  return params;
}

export class Router {
  constructor() {
    this.routes = [];
  }

  register(method, path, handler) {
    this.routes.push({ method, path, handler });
  }

  async handle(request, response) {
    const { pathname } = parseRequestUrl(request);
    const pathMatches = this.routes.filter((route) => matchPath(route.path, pathname));

    if (pathMatches.length === 0) {
      notFound(response);
      return;
    }

    const route = pathMatches.find((candidate) => candidate.method === request.method);
    if (!route) {
      methodNotAllowed(response, [...new Set(pathMatches.map((candidate) => candidate.method))]);
      return;
    }

    request.params = matchPath(route.path, pathname);
    request.query = Object.fromEntries(parseRequestUrl(request).searchParams.entries());
    await route.handler(request, response);
  }
}
