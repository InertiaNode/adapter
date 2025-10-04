import { InertiaResponseFactory } from "./InertiaResponseFactory.js";
import type { InertiaResponse } from "./InertiaResponse.js";

// Create the Inertia instance
const inertiaInstance = new InertiaResponseFactory();

// Create a callable proxy that forwards calls to render()
type InertiaCallable = InertiaResponseFactory & {
    (component: string, props?: Record<string, any>): InertiaResponse;
};

export const Inertia = new Proxy(inertiaInstance, {
    apply(target, _thisArg, args: [string, Record<string, any>?]) {
        return target.render(args[0], args[1] || {});
    }
}) as InertiaCallable;
