import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";

interface VueNodeVersion {
  vueVersion: number;
  supportedNodeRange: string;
}

const VUE_NODE_VERSIONS: VueNodeVersion[] = [
  { vueVersion: 3, supportedNodeRange: '^20.19.0 || >=22.12.0' },
  { vueVersion: 2, supportedNodeRange: '>=8.9.0 <17.0.0' },
];

function getRecommendedNodeByVue(vueVersion: number) {
  const config = VUE_NODE_VERSIONS.find(v => v.vueVersion === vueVersion);
  if (!config) throw new CoreError(CoreErrorCodes.INVALID_NAME, `不支持的 Vue 版本: ${vueVersion}`);
  return config;
}

export function getEnginesByVue(vueVersion: number) {
  const { supportedNodeRange } = getRecommendedNodeByVue(vueVersion);
  return { node: supportedNodeRange };
}
