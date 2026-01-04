export class ApiBizError extends Error {
    constructor(
        public code: string,
        message: string,
        public details?: any,
        public requestId?: string
    ) {
        super(message);
        this.name = "ApiBizError";
    }
}
