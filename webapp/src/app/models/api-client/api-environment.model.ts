import type { ApiEnvironmentEntityDto, ApiEnvironmentVariableDto } from "@yinuo-ngm/protocol";

export type ApiEnvVariable = ApiEnvironmentVariableDto & { description?: string };

export type ApiEnvEntity = Omit<ApiEnvironmentEntityDto, "variables"> & {
    variables: ApiEnvVariable[];
};
