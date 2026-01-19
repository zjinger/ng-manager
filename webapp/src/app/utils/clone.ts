/**
 * 浅拷贝一个对象
 * @param object 
 * @returns 
 */
export function clone<T>(object: T): T {
    return JSON.parse(JSON.stringify(object)) as T;
}

/**
 * 浅拷贝一个数组
 * @param array 
 * @returns 
 */
export function cloneArray<T>(array: T[]): T[] {
    return JSON.parse(JSON.stringify(array)) as T[];
}

/**
 * 深度克隆一个对象，保留对象引用并处理循环引用
 * @param object 
 * @returns 
 */
export function cloneDeep<T>(object: T, seen = new WeakMap()): T {
    if (object === null || typeof object !== 'object') {
        return object;
    }

    if (seen.has(object)) {
        return seen.get(object);
    }

    if (object instanceof Date) {
        return new Date(object.getTime()) as T;
    }

    if (object instanceof Array) {
        const cloned: any[] = [];
        seen.set(object, cloned);
        object.forEach(item => cloned.push(cloneDeep(item, seen)));
        return cloned as T;
    }

    if (object instanceof Object) {
        const cloned: any = {};
        seen.set(object, cloned);
        Object.keys(object).forEach(key => {
            cloned[key] = cloneDeep((object as any)[key], seen);
        });
        return cloned as T;
    }

    return object;
}
