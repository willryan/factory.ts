export declare type RecPartial<T> = {
    [P in keyof T]?: RecPartial<T[P]>;
};
