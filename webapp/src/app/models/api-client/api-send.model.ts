import type { SendRequestBodyDto, SendResultDto } from "@yinuo-ngm/protocol";
import { ApiRequestEntity } from "./api-request.model";
import { ApiResponseEntity } from "./api-response.model";
import { ApiScope } from "./api-types.model";

export type SendRequestBody = Omit<SendRequestBodyDto, "request" | "scope"> & {
    scope: ApiScope;
    request?: ApiRequestEntity;
};

export type SendResponse = Omit<SendResultDto, "response" | "curl"> & {
    response?: ApiResponseEntity;
    curl?: { bash: string; powershell: string; cmd: string };
};
