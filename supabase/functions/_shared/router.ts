type Handler = (req: Request, params: Record<string, string>, ctx: { organization_id: string; mode: string; key_id: string }) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];

  get(path: string, handler: Handler) {
    this.add("GET", path, handler);
  }

  post(path: string, handler: Handler) {
    this.add("POST", path, handler);
  }

  patch(path: string, handler: Handler) {
    this.add("PATCH", path, handler);
  }

  delete(path: string, handler: Handler) {
    this.add("DELETE", path, handler);
  }

  put(path: string, handler: Handler) {
    this.add("PUT", path, handler);
  }

  private add(method: string, path: string, handler: Handler) {
    const paramNames: string[] = [];
    const regexStr = "^" + path.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    }) + "$";
    this.routes.push({ method, pattern: new RegExp(regexStr), paramNames, handler });
  }

  match(method: string, path: string): { handler: Handler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method && route.method !== "ALL") continue;
      const match = path.match(route.pattern);
      if (!match) continue;
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      return { handler: route.handler, params };
    }
    return null;
  }
}
